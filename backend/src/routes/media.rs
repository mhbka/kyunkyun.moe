use std::collections::HashMap;

use axum::{
    extract::{Path, State},
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{
    auth::AuthUser,
    models::media::{PostMedia, PostMediaKind, PostMediaStatus},
    routes::{
        error::{RouteError, RouteResult},
        users::is_author,
    },
    s3::{blogpost_original_key, tweet_media_extension, UploadUrls},
    state::AppState,
};

/// Builds the blog-post media API routes.
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/uploads", post(create_upload))
        .route("/uploads/{id}/complete", post(complete_upload))
        .route("/{id}", get(get_media))
}

/// Accepts the post and image or video type for a media upload.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateUploadRequest {
    post_id: Uuid,
    content_type: String,
}

/// Returns the stable media ID and direct-upload details.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CreateUploadResponse {
    media_id: Uuid,
    upload_url: String,
    public_url: String,
}

/// Holds database fields needed to build a media API response.
#[derive(Debug, FromRow)]
struct StoredPostMedia {
    id: Uuid,
    post_id: Uuid,
    media_kind: PostMediaKind,
    status: PostMediaStatus,
    bucket_path: String,
    content_type: String,
    video_poster_id: Option<Uuid>,
    poster_bucket_path: Option<String>,
    width: Option<i32>,
    height: Option<i32>,
    created_at: DateTime<Utc>,
}

/// Creates a pending post-media record and direct upload URL.
async fn create_upload(
    State(app_state): State<AppState>,
    user: AuthUser,
    Json(request): Json<CreateUploadRequest>,
) -> RouteResult<Json<CreateUploadResponse>> {
    require_author(&app_state, user.id).await?;
    let media_kind = media_kind_for_content_type(&request.content_type)
        .ok_or(RouteError::bad_request("unsupported media type"))?;
    require_owned_post(&app_state, request.post_id, user.id).await?;

    let media_id = Uuid::new_v4();
    let (
        bucket_path,
        UploadUrls {
            upload_url,
            public_url,
        },
    ) = app_state
        .s3
        .generate_presigned_blogpost_media_upload_url(
            request.post_id,
            media_id,
            &request.content_type,
        )
        .await
        .map_err(|error| RouteError::S3(error.to_string()))?;
    sqlx::query(
        "insert into post_media
         (id, post_id, media_kind, bucket_path, content_type)
         values ($1, $2, $3, $4, $5)",
    )
    .bind(media_id)
    .bind(request.post_id)
    .bind(media_kind)
    .bind(bucket_path)
    .bind(&request.content_type)
    .execute(&app_state.pool)
    .await?;

    tracing::info!(%media_id, post_id = %request.post_id, user_id = %user.id, "post-media upload created");
    Ok(Json(CreateUploadResponse {
        media_id,
        upload_url,
        public_url,
    }))
}

/// Verifies an uploaded object and advances it to its next processing state.
async fn complete_upload(
    State(app_state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> RouteResult<Json<PostMedia>> {
    require_author(&app_state, user.id).await?;
    let media = find_owned_media(&app_state, id, user.id).await?;
    if media.status != PostMediaStatus::Pending {
        return Ok(Json(media.into_response(&app_state)));
    }

    let object = app_state
        .s3
        .blogpost_object(&media.bucket_path)
        .await
        .map_err(|error| RouteError::S3(error.to_string()))?
        .ok_or(RouteError::bad_request("media upload is incomplete"))?;
    if object.byte_size <= 0 {
        return Err(RouteError::bad_request("uploaded media is empty"));
    }
    if object.content_type.as_deref() != Some(media.content_type.as_str()) {
        return Err(RouteError::bad_request(
            "uploaded media type does not match",
        ));
    }

    let next_status = status_after_upload(media.media_kind);
    let mut transaction = app_state.pool.begin().await?;
    let media = sqlx::query_as::<_, StoredPostMedia>(
        "update post_media
         set status = $1
         where id = $2
         returning id, post_id, media_kind, status, bucket_path, content_type,
             video_poster_id, null::text as poster_bucket_path,
             width, height, created_at",
    )
    .bind(next_status)
    .bind(media.id)
    .fetch_one(&mut *transaction)
    .await?;
    if media.media_kind == PostMediaKind::Video {
        sqlx::query(
            "insert into video_processing
             (media_type, media_id, original_bucket_path)
             values ('post', $1, $2)
             on conflict (media_type, media_id) do nothing",
        )
        .bind(media.id)
        .bind(blogpost_original_key(&media.bucket_path))
        .execute(&mut *transaction)
        .await?;
    }
    transaction.commit().await?;

    tracing::info!(media_id = %media.id, ?next_status, "post-media upload completed");
    Ok(Json(media.into_response(&app_state)))
}

/// Returns one media item's current processing state to its post author.
async fn get_media(
    State(app_state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> RouteResult<Json<PostMedia>> {
    require_author(&app_state, user.id).await?;
    let media = find_owned_media(&app_state, id, user.id).await?;
    Ok(Json(media.into_response(&app_state)))
}

/// Fetches a media item only when the caller owns its post.
async fn find_owned_media(
    app_state: &AppState,
    media_id: Uuid,
    user_id: Uuid,
) -> RouteResult<StoredPostMedia> {
    sqlx::query_as::<_, StoredPostMedia>(
        "select media.id, media.post_id, media.media_kind, media.status,
             media.bucket_path, media.content_type, media.video_poster_id,
             poster.bucket_path as poster_bucket_path,
             media.width, media.height, media.created_at
         from post_media media
         join posts post on post.id = media.post_id
         left join post_media poster on poster.id = media.video_poster_id
         where media.id = $1 and post.author_id = $2 and post.deleted_at is null",
    )
    .bind(media_id)
    .bind(user_id)
    .fetch_optional(&app_state.pool)
    .await?
    .ok_or(RouteError::not_found("media not found"))
}

/// Loads the media collection explicitly saved with a post.
pub(crate) async fn referenced_media(
    app_state: &AppState,
    post_id: Uuid,
) -> Result<HashMap<Uuid, PostMedia>, sqlx::Error> {
    let media = sqlx::query_as::<_, StoredPostMedia>(
        "select media.id, media.post_id, media.media_kind, media.status,
             media.bucket_path, media.content_type, media.video_poster_id,
             poster.bucket_path as poster_bucket_path,
             media.width, media.height, media.created_at
         from post_media_references reference
         join post_media media
           on media.post_id = reference.post_id and media.id = reference.media_id
         left join post_media poster on poster.id = media.video_poster_id
         where reference.post_id = $1",
    )
    .bind(post_id)
    .fetch_all(&app_state.pool)
    .await?;

    Ok(media
        .into_iter()
        .map(|item| {
            let item = item.into_response(app_state);
            (item.id, item)
        })
        .collect())
}

/// Requires general blog-author access for a protected media route.
async fn require_author(app_state: &AppState, user_id: Uuid) -> RouteResult<()> {
    if is_author(&app_state.pool, user_id).await? {
        Ok(())
    } else {
        Err(RouteError::forbidden("author access required"))
    }
}

/// Requires the caller to own the active post receiving an upload.
async fn require_owned_post(app_state: &AppState, post_id: Uuid, user_id: Uuid) -> RouteResult<()> {
    let owns_post = sqlx::query_scalar::<_, bool>(
        "select exists(
            select 1 from posts
            where id = $1 and author_id = $2 and deleted_at is null
        )",
    )
    .bind(post_id)
    .bind(user_id)
    .fetch_one(&app_state.pool)
    .await?;
    if owns_post {
        Ok(())
    } else {
        Err(RouteError::not_found("post not found"))
    }
}

/// Maps an accepted MIME type to its media kind.
fn media_kind_for_content_type(content_type: &str) -> Option<PostMediaKind> {
    tweet_media_extension(content_type)?;
    if content_type.starts_with("video/") {
        Some(PostMediaKind::Video)
    } else {
        Some(PostMediaKind::Image)
    }
}

/// Selects whether an upload is display-ready or needs video processing.
fn status_after_upload(media_kind: PostMediaKind) -> PostMediaStatus {
    match media_kind {
        PostMediaKind::Image => PostMediaStatus::Ready,
        PostMediaKind::Video => PostMediaStatus::Processing,
    }
}

impl StoredPostMedia {
    /// Converts stored object keys into client-facing public URLs.
    fn into_response(self, app_state: &AppState) -> PostMedia {
        let public_url = match self.status {
            PostMediaStatus::Processing | PostMediaStatus::Ready => {
                Some(app_state.s3.blogpost_public_url(&self.bucket_path))
            }
            PostMediaStatus::Pending | PostMediaStatus::Failed => None,
        };
        PostMedia {
            id: self.id,
            post_id: self.post_id,
            media_kind: self.media_kind,
            status: self.status,
            public_url,
            video_poster_id: self.video_poster_id,
            poster_url: self
                .poster_bucket_path
                .map(|path| app_state.s3.blogpost_public_url(&path)),
            content_type: self.content_type,
            width: self.width,
            height: self.height,
            created_at: self.created_at,
        }
    }
}

#[cfg(test)]
#[path = "../../tests/unit/routes/media.rs"]
mod tests;
