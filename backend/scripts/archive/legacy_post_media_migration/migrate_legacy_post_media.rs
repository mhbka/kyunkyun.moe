use std::{collections::HashMap, env, path::Path, process::Stdio};

use anyhow::{anyhow, bail, Context};
use aws_config::Region;
use aws_sdk_s3::{config::Credentials, types::MetadataDirective, Client};
use regex::Regex;
use serde::Deserialize;
use sqlx::{FromRow, PgPool};
use tokio::{io::AsyncWriteExt, process::Command};
use uuid::Uuid;

const LEGACY_PREFIX: &str = "post-images";
const ORIGINAL_VIDEO_PREFIX: &str = "post-videos-original";

/// Holds the command-line choices for one migration run.
#[derive(Debug, Eq, PartialEq)]
struct Arguments {
    apply: bool,
    post_id: Option<Uuid>,
}

/// Contains one active post selected for migration.
#[derive(Debug, FromRow)]
struct PostRow {
    id: Uuid,
    content_md: String,
}

/// Identifies how a migrated object is displayed.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
enum MediaKind {
    Image,
    Video,
}

impl MediaKind {
    /// Returns the database representation of this media kind.
    fn as_str(self) -> &'static str {
        match self {
            Self::Image => "image",
            Self::Video => "video",
        }
    }
}

/// Describes one unique legacy object referenced by a post.
#[derive(Clone, Debug, Eq, PartialEq)]
struct LegacyMedia {
    id: Uuid,
    old_key: String,
    bucket_key: String,
    content_type: String,
    kind: MediaKind,
}

/// Records one exact source range to replace without reformatting Markdown.
#[derive(Clone, Debug, Eq, PartialEq)]
struct Replacement {
    start: usize,
    end: usize,
    media_id: Uuid,
}

/// Contains the validated objects and source replacements for one post.
#[derive(Debug, Eq, PartialEq)]
struct PostPlan {
    media: Vec<LegacyMedia>,
    replacements: Vec<Replacement>,
}

/// Contains object metadata needed for database registration.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
struct Dimensions {
    width: i32,
    height: i32,
}

/// Contains the S3-compatible client and blog-media bucket.
struct Storage {
    client: Client,
    bucket: String,
}

/// Contains the small portion of FFprobe output needed by the migration.
#[derive(Debug, Deserialize)]
struct ProbeOutput {
    streams: Vec<ProbeStream>,
}

/// Contains dimensions for one visual stream.
#[derive(Debug, Deserialize)]
struct ProbeStream {
    width: Option<i32>,
    height: Option<i32>,
}

#[tokio::main]
/// Migrates legacy URL-based media for active posts.
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    let arguments = parse_arguments(env::args().skip(1))?;
    let pool = connect_database().await?;
    let storage = Storage::from_environment().await?;
    let origin = required_environment("S3_BLOGPOST_MEDIA_BUCKET_URL")?;
    let posts = load_posts(&pool, arguments.post_id).await?;

    if arguments.post_id.is_some() && posts.is_empty() {
        bail!("the requested active post was not found");
    }

    let mode = if arguments.apply { "APPLY" } else { "DRY RUN" };
    println!("Legacy post-media migration: {mode}");
    let mut migrated_posts = 0usize;
    let mut migrated_media = 0usize;

    for post in posts {
        let plan = build_plan(post.id, &post.content_md, &origin)?;
        if plan.media.is_empty() {
            continue;
        }

        println!("post {}: {} media item(s)", post.id, plan.media.len());
        let mut dimensions = HashMap::new();
        for media in &plan.media {
            let item_dimensions = storage.prepare(media, arguments.apply).await?;
            println!(
                "  {} {} -> {} ({}x{})",
                media.kind.as_str(),
                media.old_key,
                media.bucket_key,
                item_dimensions.width,
                item_dimensions.height
            );
            dimensions.insert(media.id, item_dimensions);
        }

        if arguments.apply {
            apply_post(&pool, &post, &plan, &dimensions).await?;
            for media in &plan.media {
                if media.kind == MediaKind::Video && media.old_key != media.bucket_key {
                    storage.delete_if_present(&media.old_key).await?;
                }
            }
        }
        migrated_posts += 1;
        migrated_media += plan.media.len();
    }

    println!("{mode} complete: {migrated_posts} post(s), {migrated_media} media item(s)");
    if !arguments.apply {
        println!("Run again with --apply to commit these changes.");
    }
    Ok(())
}

/// Parses the intentionally small migration command-line interface.
fn parse_arguments(arguments: impl IntoIterator<Item = String>) -> anyhow::Result<Arguments> {
    let mut apply = false;
    let mut post_id = None;
    let mut arguments = arguments.into_iter();

    while let Some(argument) = arguments.next() {
        match argument.as_str() {
            "--apply" => apply = true,
            "--post" => {
                let value = arguments
                    .next()
                    .ok_or_else(|| anyhow!("--post requires a UUID"))?;
                post_id = Some(value.parse().context("--post must be a valid UUID")?);
            }
            "--help" | "-h" => {
                println!(
                    "Usage: migrate-legacy-post-media [--post <uuid>] [--apply]\n\n\
                     Dry-run is the default. --apply commits database and R2 changes."
                );
                std::process::exit(0);
            }
            _ => bail!("unknown argument: {argument}"),
        }
    }

    Ok(Arguments { apply, post_id })
}

/// Opens the migration's database connection pool.
async fn connect_database() -> anyhow::Result<PgPool> {
    let database_url = required_environment("DATABASE_URL")?;
    sqlx::postgres::PgPoolOptions::new()
        .max_connections(4)
        .connect(&database_url)
        .await
        .context("failed to connect to the database")
}

/// Loads active posts, optionally restricted to one ID.
async fn load_posts(pool: &PgPool, post_id: Option<Uuid>) -> anyhow::Result<Vec<PostRow>> {
    sqlx::query_as::<_, PostRow>(
        "select id, content_md
         from posts
         where deleted_at is null and ($1::uuid is null or id = $1)
         order by created_at, id",
    )
    .bind(post_id)
    .fetch_all(pool)
    .await
    .context("failed to load active posts")
}

/// Builds a formatting-preserving migration plan from recognized source values.
fn build_plan(post_id: Uuid, markdown: &str, origin: &str) -> anyhow::Result<PostPlan> {
    let uuid = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
    let pattern = format!(
        r"{}/post-images/(?P<post>{})/(?P<media>{})\.(?P<extension>[A-Za-z0-9]+)",
        regex::escape(origin.trim_end_matches('/')),
        uuid,
        uuid
    );
    let legacy_url = Regex::new(&pattern)?;
    let mut media = Vec::<LegacyMedia>::new();
    let mut replacements = Vec::new();

    for captures in legacy_url.captures_iter(markdown) {
        let full_match = captures.get(0).expect("the full regex match exists");
        let Some(expected_kind) = source_kind(markdown, full_match.start(), full_match.end())
        else {
            continue;
        };
        let url_post_id: Uuid = captures["post"].parse()?;
        if url_post_id != post_id {
            bail!(
                "post {post_id} contains managed media owned by {url_post_id}: {}",
                full_match.as_str()
            );
        }

        let media_id: Uuid = captures["media"].parse()?;
        let extension = captures["extension"].to_ascii_lowercase();
        let (kind, content_type) = media_type(&extension)
            .ok_or_else(|| anyhow!("unsupported legacy media extension: {extension}"))?;
        if expected_kind == Some(MediaKind::Video) && kind != MediaKind::Video {
            bail!(
                "video directive references a non-video object: {}",
                full_match.as_str()
            );
        }
        if expected_kind == Some(MediaKind::Image) && kind != MediaKind::Image {
            bail!(
                "Markdown image references a non-image object: {}",
                full_match.as_str()
            );
        }

        let old_key = format!("{LEGACY_PREFIX}/{post_id}/{media_id}.{extension}");
        let bucket_key = match kind {
            MediaKind::Image => old_key.clone(),
            MediaKind::Video => {
                format!("{ORIGINAL_VIDEO_PREFIX}/{post_id}/{media_id}.{extension}")
            }
        };
        let item = LegacyMedia {
            id: media_id,
            old_key,
            bucket_key,
            content_type: content_type.to_owned(),
            kind,
        };
        if let Some(existing) = media.iter().find(|existing| existing.id == media_id) {
            if existing != &item {
                bail!("media ID {media_id} maps to conflicting legacy objects");
            }
        } else {
            media.push(item);
        }
        replacements.push(Replacement {
            start: full_match.start(),
            end: full_match.end(),
            media_id,
        });
    }

    Ok(PostPlan {
        media,
        replacements,
    })
}

/// Identifies whether a URL occupies a supported Markdown media source position.
fn source_kind(markdown: &str, start: usize, end: usize) -> Option<Option<MediaKind>> {
    let before = &markdown[..start];
    let after = &markdown[end..];

    // Match directive attributes without interpreting or reserializing the document.
    let quote = if before.ends_with("src=\"") {
        '"'
    } else if before.ends_with("src='") {
        '\''
    } else {
        '\0'
    };
    if quote != '\0' && after.starts_with(quote) {
        let line = before.rsplit_once('\n').map_or(before, |(_, line)| line);
        if line.contains("::video{") {
            return Some(Some(MediaKind::Video));
        }
        if line.contains("::pic{") {
            return Some(None);
        }
    }

    // Match ordinary Markdown images while excluding normal links.
    if before.ends_with("](") && (after.starts_with(')') || after.starts_with(char::is_whitespace))
    {
        let line = before.rsplit_once('\n').map_or(before, |(_, line)| line);
        let closing_label = line.len().saturating_sub(2);
        if let Some(label_start) = line[..closing_label].rfind('[') {
            let is_image = label_start > 0 && line.as_bytes()[label_start - 1] == b'!';
            if is_image {
                return Some(Some(MediaKind::Image));
            }
        }
    }
    None
}

/// Maps legacy filename extensions to database metadata.
fn media_type(extension: &str) -> Option<(MediaKind, &'static str)> {
    match extension {
        "avif" => Some((MediaKind::Image, "image/avif")),
        "gif" => Some((MediaKind::Image, "image/gif")),
        "jpg" | "jpeg" => Some((MediaKind::Image, "image/jpeg")),
        "png" => Some((MediaKind::Image, "image/png")),
        "webp" => Some((MediaKind::Image, "image/webp")),
        "mp4" => Some((MediaKind::Video, "video/mp4")),
        "webm" => Some((MediaKind::Video, "video/webm")),
        _ => None,
    }
}

/// Replaces only the exact source ranges discovered during validation.
fn rewrite_markdown(markdown: &str, replacements: &[Replacement]) -> String {
    let mut rewritten = markdown.to_owned();
    for replacement in replacements.iter().rev() {
        rewritten.replace_range(
            replacement.start..replacement.end,
            &format!("media:{}", replacement.media_id),
        );
    }
    rewritten
}

impl Storage {
    /// Builds an R2 client from the backend's existing environment variables.
    async fn from_environment() -> anyhow::Result<Self> {
        let account_id = required_environment("S3_ACCOUNT_ID")?;
        let access_key_id = required_environment("S3_ACCESS_KEY_ID")?;
        let access_key_secret = required_environment("S3_ACCESS_KEY_SECRET")?;
        let bucket = required_environment("S3_BLOGPOST_MEDIA_BUCKET_NAME")?;
        let config = aws_config::from_env()
            .endpoint_url(format!("https://{account_id}.r2.cloudflarestorage.com"))
            .credentials_provider(Credentials::new(
                access_key_id,
                access_key_secret,
                None,
                None,
                "R2",
            ))
            .region(Region::new("auto"))
            .load()
            .await;
        Ok(Self {
            client: Client::new(&config),
            bucket,
        })
    }

    /// Verifies an object, optionally copies a video, and reads its dimensions.
    async fn prepare(&self, media: &LegacyMedia, apply: bool) -> anyhow::Result<Dimensions> {
        let old_size = self.object_size(&media.old_key).await?;
        let destination_size = if media.kind == MediaKind::Video {
            self.object_size(&media.bucket_key).await?
        } else {
            old_size
        };

        let inspection_key = match (old_size, destination_size) {
            (Some(size), _) if size > 0 => &media.old_key,
            (None, Some(size)) if media.kind == MediaKind::Video && size > 0 => &media.bucket_key,
            (Some(_), _) => bail!("R2 object is empty: {}", media.old_key),
            _ => bail!("R2 object does not exist: {}", media.old_key),
        };
        let dimensions = self.inspect_dimensions(inspection_key).await?;

        if apply && media.kind == MediaKind::Video && old_size.is_some() {
            if destination_size != old_size {
                self.copy(&media.old_key, &media.bucket_key).await?;
            }
            let copied_size = self.object_size(&media.bucket_key).await?;
            if copied_size != old_size {
                bail!(
                    "copied video failed size verification: {}",
                    media.bucket_key
                );
            }
        }
        Ok(dimensions)
    }

    /// Returns an object's byte length when it exists.
    async fn object_size(&self, key: &str) -> anyhow::Result<Option<i64>> {
        match self
            .client
            .head_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
        {
            Ok(object) => Ok(object.content_length()),
            Err(error)
                if error
                    .as_service_error()
                    .is_some_and(|service| service.is_not_found()) =>
            {
                Ok(None)
            }
            Err(error) => Err(error).context(format!("failed to inspect R2 object {key}")),
        }
    }

    /// Copies an object within the blog-media bucket while retaining its metadata.
    async fn copy(&self, source: &str, destination: &str) -> anyhow::Result<()> {
        self.client
            .copy_object()
            .bucket(&self.bucket)
            .copy_source(format!("{}/{source}", self.bucket))
            .key(destination)
            .metadata_directive(MetadataDirective::Copy)
            .send()
            .await
            .with_context(|| format!("failed to copy {source} to {destination}"))?;
        Ok(())
    }

    /// Downloads one object temporarily and reads its visual dimensions.
    async fn inspect_dimensions(&self, key: &str) -> anyhow::Result<Dimensions> {
        let directory = tempfile::tempdir()?;
        let path = directory.path().join("legacy-media");
        let object = self
            .client
            .get_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
            .with_context(|| format!("failed to download R2 object {key}"))?;
        let mut body = object.body.into_async_read();
        let mut file = tokio::fs::File::create(&path).await?;
        tokio::io::copy(&mut body, &mut file).await?;
        file.flush().await?;
        probe_dimensions(&path).await
    }

    /// Deletes a source object after the database points at its verified copy.
    async fn delete_if_present(&self, key: &str) -> anyhow::Result<()> {
        if self.object_size(key).await?.is_none() {
            return Ok(());
        }
        self.client
            .delete_object()
            .bucket(&self.bucket)
            .key(key)
            .send()
            .await
            .with_context(|| {
                format!("database updated, but failed to delete legacy object {key}")
            })?;
        Ok(())
    }
}

/// Reads positive width and height values with FFprobe.
async fn probe_dimensions(path: &Path) -> anyhow::Result<Dimensions> {
    let output = Command::new("ffprobe")
        .args([
            "-v",
            "error",
            "-select_streams",
            "v:0",
            "-show_entries",
            "stream=width,height",
            "-of",
            "json",
        ])
        .arg(path)
        .stdin(Stdio::null())
        .output()
        .await
        .context("failed to start ffprobe; install FFmpeg before running this migration")?;
    if !output.status.success() {
        bail!(
            "ffprobe failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }

    let probe: ProbeOutput = serde_json::from_slice(&output.stdout)?;
    let stream = probe
        .streams
        .first()
        .ok_or_else(|| anyhow!("media has no visual stream"))?;
    match (stream.width, stream.height) {
        (Some(width), Some(height)) if width > 0 && height > 0 => Ok(Dimensions { width, height }),
        _ => bail!("media dimensions are missing or invalid"),
    }
}

/// Commits one post's media records, references, jobs, and Markdown atomically.
async fn apply_post(
    pool: &PgPool,
    post: &PostRow,
    plan: &PostPlan,
    dimensions: &HashMap<Uuid, Dimensions>,
) -> anyhow::Result<()> {
    let mut transaction = pool.begin().await?;
    let current_markdown = sqlx::query_scalar::<_, String>(
        "select content_md from posts where id = $1 and deleted_at is null for update",
    )
    .bind(post.id)
    .fetch_optional(&mut *transaction)
    .await?
    .ok_or_else(|| anyhow!("post {} was deleted during migration", post.id))?;
    if current_markdown != post.content_md {
        bail!(
            "post {} changed during migration; rerun the command",
            post.id
        );
    }

    for media in &plan.media {
        let item_dimensions = dimensions
            .get(&media.id)
            .ok_or_else(|| anyhow!("dimensions missing for media {}", media.id))?;
        let existing = sqlx::query_as::<_, (Uuid, String, String)>(
            "select post_id, bucket_path, media_kind from post_media where id = $1",
        )
        .bind(media.id)
        .fetch_optional(&mut *transaction)
        .await?;
        if let Some((existing_post_id, existing_path, existing_kind)) = existing {
            if existing_post_id != post.id
                || existing_path != media.bucket_key
                || existing_kind != media.kind.as_str()
            {
                bail!("existing post_media row conflicts with media {}", media.id);
            }
            sqlx::query("update post_media set width = $1, height = $2 where id = $3")
                .bind(item_dimensions.width)
                .bind(item_dimensions.height)
                .bind(media.id)
                .execute(&mut *transaction)
                .await?;
        } else {
            sqlx::query(
                "insert into post_media
                 (id, post_id, media_kind, status, bucket_path, content_type, width, height)
                 values ($1, $2, $3, 'ready', $4, $5, $6, $7)",
            )
            .bind(media.id)
            .bind(post.id)
            .bind(media.kind.as_str())
            .bind(&media.bucket_key)
            .bind(&media.content_type)
            .bind(item_dimensions.width)
            .bind(item_dimensions.height)
            .execute(&mut *transaction)
            .await?;
        }

        sqlx::query(
            "insert into post_media_references (post_id, media_id)
             values ($1, $2) on conflict do nothing",
        )
        .bind(post.id)
        .bind(media.id)
        .execute(&mut *transaction)
        .await?;
        if media.kind == MediaKind::Video {
            sqlx::query(
                "insert into video_processing (media_type, media_id, original_bucket_path)
                 values ('post', $1, $2)
                 on conflict (media_type, media_id) do nothing",
            )
            .bind(media.id)
            .bind(&media.bucket_key)
            .execute(&mut *transaction)
            .await?;
        }
    }

    let rewritten = rewrite_markdown(&post.content_md, &plan.replacements);
    sqlx::query("update posts set content_md = $1 where id = $2")
        .bind(rewritten)
        .bind(post.id)
        .execute(&mut *transaction)
        .await?;
    transaction.commit().await?;
    Ok(())
}

/// Loads a required environment variable with a useful error message.
fn required_environment(name: &str) -> anyhow::Result<String> {
    env::var(name).with_context(|| format!("{name} is not configured"))
}
