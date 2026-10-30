use std::collections::HashSet;

use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use serde::Deserialize;
use sqlx::PgPool;
use uuid::Uuid;

use crate::db;
use crate::models::posts::*;
use crate::routes::error::{RouteError, RouteResult};
use crate::{
    auth::{AuthUser, OptionalAuthUser},
    state::AppState,
};

/// Builds the post API routes.
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_posts).post(create_post))
        .route("/drafts", get(list_drafts))
        .route("/{slug}", get(get_post_by_slug))
        .route(
            "/id/{id}",
            get(get_post_by_id).put(update_post).delete(delete_post),
        )
        .route("/id/{id}/publish", post(publish_post))
        .route("/id/{id}/draft", post(move_post_to_draft))
}

/// Verifies that the authenticated user is allowed to manage posts.
async fn require_author(pool: &PgPool, user_id: Uuid) -> RouteResult<()> {
    if crate::routes::users::is_author(pool, user_id).await? {
        Ok(())
    } else {
        tracing::info!(%user_id, "author access denied");
        Err(RouteError::forbidden("author access required"))
    }
}

/// GET  — published posts only, newest first. Paginate as needed.
const DEFAULT_PAGE_SIZE: u32 = 50;
const MAX_PAGE_SIZE: u32 = 100;

/// Accepts optional pagination and tag-filter values for post listings.
#[derive(Debug, Deserialize)]
struct ListPostsQuery {
    page: Option<u32>,
    size: Option<u32>,
    tag: Option<String>,
    tags: Option<String>,
}

impl ListPostsQuery {
    /// Converts validated pagination values into a SQL limit and offset.
    fn pagination(self) -> Result<(i64, i64), RouteError> {
        let page = self.page.unwrap_or(1);
        let size = self.size.unwrap_or(DEFAULT_PAGE_SIZE);

        if page == 0 {
            return Err(RouteError::bad_request("page must be at least 1"));
        }
        if size == 0 || size > MAX_PAGE_SIZE {
            return Err(RouteError::bad_request("size must be between 1 and 100"));
        }

        let offset = u64::from(page - 1) * u64::from(size);
        Ok((i64::from(size), offset as i64))
    }
}

/// Lists published posts using the requested pagination and tag filter.
async fn list_posts(
    State(app_state): State<AppState>,
    OptionalAuthUser(_user): OptionalAuthUser,
    Query(query): Query<ListPostsQuery>,
) -> RouteResult<Json<PostPage>> {
    let tag = super::tags::parse_filters(query.tag.as_deref(), query.tags.as_deref())?;
    let (size, offset) = query.pagination()?;
    let posts = sqlx::query_as::<_, PostSummary>(
        r#"
        select id, title, slug, thumbnail_url, tags, published_at, updated_at
        from posts
        where status = 'published' and published_at <= now() and deleted_at is null
          and tags @> $1::text[]
        order by published_at desc, id desc
        limit $2 offset $3
        "#,
    )
    .bind(tag)
    // Fetch one extra row without changing the page-size-based offset.
    .bind(size + 1)
    .bind(offset)
    .fetch_all(&app_state.pool)
    .await?;

    Ok(Json(PostPage::from_posts(posts, size as usize)))
}

/// GET /drafts — the authenticated author's drafts, newest updated first.
async fn list_drafts(
    State(app_state): State<AppState>,
    user: AuthUser,
) -> RouteResult<Json<Vec<DraftPostSummary>>> {
    require_author(&app_state.pool, user.id).await?;

    let posts = sqlx::query_as::<_, DraftPostSummary>(
        r#"
        select id, title, slug, thumbnail_url, tags, updated_at
        from posts
        where status = 'draft' and author_id = $1 and deleted_at is null
        order by updated_at desc
        "#,
    )
    .bind(user.id)
    .fetch_all(&app_state.pool)
    .await?;

    Ok(Json(posts))
}

#[cfg(test)]
#[path = "../../tests/unit/routes/posts.rs"]
mod tests;

/// GET /:slug — public read of a single published post.
async fn get_post_by_slug(
    State(app_state): State<AppState>,
    Path(slug): Path<String>,
) -> RouteResult<Json<Post>> {
    let post = sqlx::query_as::<_, Post>(
        r#"
        select * from posts
        where slug = $1 and status = 'published' and published_at <= now() and deleted_at is null
        "#,
    )
    .bind(slug)
    .fetch_optional(&app_state.pool)
    .await?
    .ok_or(RouteError::not_found("post not found"))?;

    Ok(Json(with_media(&app_state, post).await?))
}

/// GET /id/:id — author-only access to a post, including drafts.
async fn get_post_by_id(
    State(app_state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> RouteResult<Json<Post>> {
    require_author(&app_state.pool, user.id).await?;

    let post = sqlx::query_as::<_, Post>(
        "select * from posts where id = $1 and author_id = $2 and deleted_at is null",
    )
    .bind(id)
    .bind(user.id)
    .fetch_optional(&app_state.pool)
    .await?
    .ok_or(RouteError::not_found("post not found"))?;

    Ok(Json(with_media(&app_state, post).await?))
}

/// POST  — creates a draft. Requires auth.
async fn create_post(
    State(app_state): State<AppState>,
    user: AuthUser,
    Json(req): Json<CreatePostRequest>,
) -> RouteResult<Json<Post>> {
    require_author(&app_state.pool, user.id).await?;
    if !req.media_ids.is_empty() {
        return Err(RouteError::bad_request(
            "new drafts cannot reference media before they are created",
        ));
    }

    let slug = requested_slug(req.slug, &req.title)?;
    let tags = normalize_tags(req.tags.unwrap_or_default());
    let mut transaction = app_state.pool.begin().await?;
    let post = sqlx::query_as::<_, Post>(
        r#"
        insert into posts (author_id, title, slug, content_md, tags)
        values ($1, $2, $3, $4, $5)
        returning *
        "#,
    )
    .bind(user.id)
    .bind(&req.title)
    .bind(&slug)
    .bind(&req.content_md)
    .bind(&tags)
    .fetch_one(&mut *transaction)
    .await?;

    // Snapshot the first revision immediately.
    sqlx::query(
        "insert into post_revisions (post_id, title, content_md, created_by) values ($1, $2, $3, $4)",
    )
    .bind(post.id)
    .bind(&post.title)
    .bind(&post.content_md)
    .bind(user.id)
    .execute(&mut *transaction)
    .await?;
    transaction.commit().await?;

    tracing::info!(post_id = %post.id, user_id = %user.id, slug = %post.slug, "post draft created");
    Ok(Json(with_media(&app_state, post).await?))
}

/// PUT /id/:id — edit a post (title/content/etc). Author-only.
async fn update_post(
    State(app_state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdatePostRequest>,
) -> RouteResult<Json<Post>> {
    require_author(&app_state.pool, user.id).await?;

    let media_ids = req.media_ids.map(normalize_media_ids);
    let mut transaction = app_state.pool.begin().await?;
    let existing =
        sqlx::query_as::<_, Post>("select * from posts where id = $1 and author_id = $2")
            .bind(id)
            .bind(user.id)
            .fetch_optional(&mut *transaction)
            .await?
            .ok_or(RouteError::not_found("post not found"))?;

    if let Some(media_ids) = &media_ids {
        require_owned_media(&mut transaction, id, media_ids).await?;
    }

    let title = req.title.unwrap_or(existing.title);
    let content_md = req.content_md.unwrap_or(existing.content_md);
    let thumbnail_url = req.thumbnail_url.or(existing.thumbnail_url);
    let slug = match req.slug {
        Some(slug) => requested_slug(Some(slug), &title)?,
        None => existing.slug,
    };
    let tags = req.tags.map(normalize_tags).unwrap_or(existing.tags);

    let post = sqlx::query_as::<_, Post>(
        r#"
        update posts set
          title = $1, content_md = $2, thumbnail_url = $3, slug = $4, tags = $5
        where id = $6 and author_id = $7
        returning *
        "#,
    )
    .bind(&title)
    .bind(&content_md)
    .bind(&thumbnail_url)
    .bind(&slug)
    .bind(&tags)
    .bind(id)
    .bind(user.id)
    .fetch_one(&mut *transaction)
    .await?;

    if let Some(media_ids) = &media_ids {
        replace_media_references(&mut transaction, id, media_ids).await?;
    }

    // Snapshot a revision on every save. Prune/collapse old ones later if the
    // table grows large — not a concern early on.
    sqlx::query(
        "insert into post_revisions (post_id, title, content_md, created_by) values ($1, $2, $3, $4)",
    )
    .bind(post.id)
    .bind(&post.title)
    .bind(&post.content_md)
    .bind(user.id)
    .execute(&mut *transaction)
    .await?;
    transaction.commit().await?;

    app_state.invalidate_latest().await;
    tracing::info!(post_id = %post.id, user_id = %user.id, slug = %post.slug, "post updated");
    Ok(Json(with_media(&app_state, post).await?))
}

/// Removes duplicate media IDs while retaining their first occurrence.
fn normalize_media_ids(media_ids: Vec<Uuid>) -> Vec<Uuid> {
    let mut seen = HashSet::new();
    media_ids
        .into_iter()
        .filter(|media_id| seen.insert(*media_id))
        .collect()
}

/// Verifies that every submitted media item belongs to the post being saved.
async fn require_owned_media(
    transaction: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    post_id: Uuid,
    media_ids: &[Uuid],
) -> RouteResult<()> {
    let owned_count = sqlx::query_scalar::<_, i64>(
        "select count(*) from post_media where post_id = $1 and id = any($2)",
    )
    .bind(post_id)
    .bind(media_ids)
    .fetch_one(&mut **transaction)
    .await?;

    if owned_count == media_ids.len() as i64 {
        Ok(())
    } else {
        Err(RouteError::bad_request(
            "all media IDs must belong to the post",
        ))
    }
}

/// Replaces the post's saved media collection within its save transaction.
async fn replace_media_references(
    transaction: &mut sqlx::Transaction<'_, sqlx::Postgres>,
    post_id: Uuid,
    media_ids: &[Uuid],
) -> Result<(), sqlx::Error> {
    sqlx::query("delete from post_media_references where post_id = $1")
        .bind(post_id)
        .execute(&mut **transaction)
        .await?;

    if !media_ids.is_empty() {
        sqlx::query(
            "insert into post_media_references (post_id, media_id)
             select $1, unnest($2::uuid[])",
        )
        .bind(post_id)
        .bind(media_ids)
        .execute(&mut **transaction)
        .await?;
    }
    Ok(())
}

/// Adds the saved media lookup map to a full post response.
async fn with_media(app_state: &AppState, mut post: Post) -> RouteResult<Post> {
    post.media = super::media::referenced_media(app_state, post.id).await?;
    Ok(post)
}

/// Uses a requested valid slug or derives one from the title.
fn requested_slug(slug: Option<String>, title: &str) -> Result<String, RouteError> {
    match slug {
        Some(slug) if !slug.is_empty() && !db::is_valid_slug(&slug) => Err(
            RouteError::bad_request("slug may contain only letters, numbers, and hyphens"),
        ),
        Some(slug) if !slug.is_empty() => Ok(slug),
        _ => Ok(db::slugify(title)),
    }
}

/// Normalizes tags and removes duplicates while preserving their order.
fn normalize_tags(tags: Vec<String>) -> Vec<String> {
    let mut normalized = Vec::new();

    for tag in tags {
        let tag = normalize_tag(&tag);
        if !tag.is_empty() && !normalized.contains(&tag) {
            normalized.push(tag);
        }
    }

    normalized
}

/// Converts a tag to its compact lowercase representation.
fn normalize_tag(tag: &str) -> String {
    tag.to_lowercase().split_whitespace().collect()
}

/// POST /id/:id/publish — publishes immediately.
async fn publish_post(
    State(app_state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> RouteResult<Json<Post>> {
    require_author(&app_state.pool, user.id).await?;

    let mut transaction = app_state.pool.begin().await?;
    let unavailable_media = sqlx::query_scalar::<_, i64>(
        "select count(*)
         from post_media_references reference
         join post_media media on media.id = reference.media_id
         join posts post on post.id = reference.post_id
         where reference.post_id = $1 and post.author_id = $2
           and media.status <> 'ready'",
    )
    .bind(id)
    .bind(user.id)
    .fetch_one(&mut *transaction)
    .await?;
    if unavailable_media > 0 {
        return Err(RouteError::bad_request(
            "all referenced media uploads must be complete before publishing",
        ));
    }

    let post = sqlx::query_as::<_, Post>(
        r#"
        update posts set status = $1, published_at = now()
        where id = $2 and author_id = $3 and status = 'draft' and deleted_at is null
        returning *
        "#,
    )
    .bind(PostStatus::Published)
    .bind(id)
    .bind(user.id)
    .fetch_optional(&mut *transaction)
    .await?
    .ok_or(RouteError::not_found("post not found"))?;
    transaction.commit().await?;

    app_state.invalidate_latest().await;
    tracing::info!(post_id = %post.id, user_id = %user.id, "post published");
    Ok(Json(with_media(&app_state, post).await?))
}

/// POST /id/:id/draft — removes a published post from the public blog.
async fn move_post_to_draft(
    State(app_state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> RouteResult<Json<Post>> {
    require_author(&app_state.pool, user.id).await?;

    let post = sqlx::query_as::<_, Post>(
        r#"
        update posts set status = $1, published_at = null
        where id = $2 and author_id = $3 and status = 'published' and deleted_at is null
        returning *
        "#,
    )
    .bind(PostStatus::Draft)
    .bind(id)
    .bind(user.id)
    .fetch_optional(&app_state.pool)
    .await?
    .ok_or(RouteError::not_found("post not found"))?;

    app_state.invalidate_latest().await;
    tracing::info!(post_id = %post.id, user_id = %user.id, "post moved to draft");
    Ok(Json(with_media(&app_state, post).await?))
}

/// DELETE /id/:id — soft delete.
async fn delete_post(
    State(app_state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> RouteResult<StatusCode> {
    require_author(&app_state.pool, user.id).await?;

    sqlx::query("update posts set deleted_at = now() where id = $1 and author_id = $2")
        .bind(id)
        .bind(user.id)
        .execute(&app_state.pool)
        .await?;

    app_state.invalidate_latest().await;
    tracing::info!(post_id = %id, user_id = %user.id, "post soft deleted");
    Ok(StatusCode::NO_CONTENT)
}
