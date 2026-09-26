use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{
    auth::AuthUser,
    models::tweets::{CreateTweetRequest, Tweet, TweetMedia, TweetPage},
    routes::{
        error::{RouteError, RouteResult},
        users::is_tweet,
    },
    s3::{tweet_media_extension, UploadUrls},
    state::AppState,
};

const DEFAULT_PAGE_SIZE: i64 = 30;
const MAX_PAGE_SIZE: i64 = 100;
const MAX_MEDIA_PER_TWEET: usize = 5;
const MAX_MEDIA_BYTES: i64 = 100 * 1024 * 1024;
const MAX_BODY_LENGTH: usize = 500;

/// Builds the short-form post API routes.
pub fn router() -> Router<AppState> {
    Router::new()
        .route("/", get(list_tweets).post(create_tweet))
        .route("/tags", get(list_tags))
        .route("/id/{id}", axum::routing::delete(delete_tweet))
        .route("/uploads", post(create_upload))
        .route("/uploads/{id}/complete", post(complete_upload))
}

/// Lists tags used by public tweets.
async fn list_tags(
    State(app_state): State<AppState>,
) -> RouteResult<Json<Vec<crate::models::tags::TagSummary>>> {
    let tags = sqlx::query_as::<_, crate::models::tags::TagSummary>(
        "select tag, count(*)::bigint as count from tweets cross join lateral unnest(tags) as tag
         where deleted_at is null group by tag order by count desc, tag asc",
    )
    .fetch_all(&app_state.pool)
    .await?;
    Ok(Json(tags))
}

/// Accepts timeline pagination and tag filters.
#[derive(Debug, Deserialize)]
struct ListTweetsQuery {
    limit: Option<i64>,
    before: Option<Uuid>,
    tag: Option<String>,
    tags: Option<String>,
}

/// Represents a tweet before its attachments are populated.
#[derive(FromRow)]
struct TweetRow {
    id: Uuid,
    author_id: Uuid,
    body: String,
    tags: Vec<String>,
    created_at: DateTime<Utc>,
}

/// Returns a public page of tweets, newest first.
async fn list_tweets(
    State(app_state): State<AppState>,
    Query(query): Query<ListTweetsQuery>,
) -> RouteResult<Json<TweetPage>> {
    let limit = query
        .limit
        .unwrap_or(DEFAULT_PAGE_SIZE)
        .clamp(1, MAX_PAGE_SIZE);
    let tags = super::tags::parse_filters(query.tag.as_deref(), query.tags.as_deref())?;
    let rows = sqlx::query_as::<_, TweetRow>(
        "select id, author_id, body, tags, created_at from tweets
         where deleted_at is null and tags @> $2::text[]
           and ($1::uuid is null or (created_at, id) < (select created_at, id from tweets where id = $1))
         order by created_at desc, id desc limit $3",
    )
        .bind(query.before)
        .bind(tags)
        .bind(limit + 1)
        .fetch_all(&app_state.pool)
        .await?;
    let has_more = rows.len() as i64 > limit;
    let next_before = has_more.then(|| rows[limit as usize - 1].id);
    let mut tweets = Vec::with_capacity(limit as usize);
    for row in rows.into_iter().take(limit as usize) {
        tweets.push(tweet_with_media(&app_state, row).await?);
    }
    Ok(Json(TweetPage {
        tweets,
        next_before,
        has_more,
    }))
}

/// Joins a tweet row to its displayable attachments.
async fn tweet_with_media(app_state: &AppState, row: TweetRow) -> Result<Tweet, sqlx::Error> {
    let media = sqlx::query_as::<_, TweetMedia>(
        "select id, public_url, content_type, media_kind, position from tweet_media
         where tweet_id = $1 and uploaded_at is not null order by position",
    )
    .bind(row.id)
    .fetch_all(&app_state.pool)
    .await?;
    Ok(Tweet {
        id: row.id,
        author_id: row.author_id,
        body: row.body,
        tags: row.tags,
        created_at: row.created_at,
        media,
    })
}

/// Publishes a tweet with a user's completed pending attachments.
async fn create_tweet(
    State(app_state): State<AppState>,
    user: AuthUser,
    Json(request): Json<CreateTweetRequest>,
) -> RouteResult<Json<Tweet>> {
    require_tweet_access(&app_state, user.id).await?;
    let body = request.body.trim().to_owned();
    if body.chars().count() > MAX_BODY_LENGTH {
        return Err(RouteError::bad_request(
            "tweet text must be 500 characters or fewer",
        ));
    }
    if request.media_ids.len() > MAX_MEDIA_PER_TWEET {
        return Err(RouteError::bad_request(
            "a tweet may have at most 5 attachments",
        ));
    }
    if request.media_ids.len()
        != request
            .media_ids
            .iter()
            .collect::<std::collections::HashSet<_>>()
            .len()
    {
        return Err(RouteError::bad_request("attachments must be unique"));
    }
    if body.is_empty() && request.media_ids.is_empty() {
        return Err(RouteError::bad_request("tweet text or media is required"));
    }
    let mut transaction = app_state.pool.begin().await?;
    let ready_count = sqlx::query_scalar::<_, i64>(
        "select count(*) from tweet_media where id = any($1) and uploader_id = $2 and tweet_id is null and uploaded_at is not null",
    ).bind(&request.media_ids).bind(user.id).fetch_one(&mut *transaction).await?;
    if ready_count as usize != request.media_ids.len() {
        return Err(RouteError::bad_request(
            "all attachments must be your completed uploads",
        ));
    }
    let row = sqlx::query_as::<_, TweetRow>(
        "insert into tweets (author_id, body, tags) values ($1, $2, $3) returning id, author_id, body, tags, created_at",
    ).bind(user.id).bind(&body).bind(normalize_tags(request.tags)).fetch_one(&mut *transaction).await?;
    for (position, media_id) in request.media_ids.iter().enumerate() {
        sqlx::query("update tweet_media set tweet_id = $1, position = $2 where id = $3")
            .bind(row.id)
            .bind(position as i32)
            .bind(media_id)
            .execute(&mut *transaction)
            .await?;
    }
    transaction.commit().await?;
    tracing::info!(tweet_id = %row.id, user_id = %user.id, "tweet published");
    Ok(Json(tweet_with_media(&app_state, row).await?))
}

/// Deletes one of the current user's tweets from the public feed.
async fn delete_tweet(
    State(app_state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> RouteResult<StatusCode> {
    require_tweet_access(&app_state, user.id).await?;
    let result = sqlx::query("update tweets set deleted_at = now() where id = $1 and author_id = $2 and deleted_at is null")
        .bind(id).bind(user.id).execute(&app_state.pool).await?;
    if result.rows_affected() == 0 {
        return Err(RouteError::not_found("tweet not found"));
    }
    Ok(StatusCode::NO_CONTENT)
}

/// Accepts metadata for a pending direct media upload.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct CreateUploadRequest {
    content_type: String,
    byte_size: i64,
}

/// Returns the upload details for a pending media item.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CreateUploadResponse {
    media_id: Uuid,
    upload_url: String,
    public_url: String,
}

/// Creates a pending tweet attachment and direct storage URL.
async fn create_upload(
    State(app_state): State<AppState>,
    user: AuthUser,
    Json(request): Json<CreateUploadRequest>,
) -> RouteResult<Json<CreateUploadResponse>> {
    require_tweet_access(&app_state, user.id).await?;
    if tweet_media_extension(&request.content_type).is_none() {
        return Err(RouteError::bad_request("unsupported media type"));
    }
    if request.byte_size <= 0 || request.byte_size > MAX_MEDIA_BYTES {
        return Err(RouteError::bad_request(
            "attachments must be 100 MB or smaller",
        ));
    }
    let media_id = Uuid::new_v4();
    let (
        bucket_path,
        UploadUrls {
            upload_url,
            public_url,
        },
    ) = app_state
        .s3
        .generate_presigned_tweet_upload_url(media_id, &request.content_type)
        .await
        .map_err(|error| RouteError::S3(error.to_string()))?;
    let media_kind = if request.content_type.starts_with("video/") {
        "video"
    } else {
        "image"
    };
    sqlx::query("insert into tweet_media (id, uploader_id, bucket_path, public_url, content_type, media_kind, byte_size) values ($1, $2, $3, $4, $5, $6, $7)")
        .bind(media_id).bind(user.id).bind(bucket_path).bind(&public_url).bind(request.content_type).bind(media_kind).bind(request.byte_size).execute(&app_state.pool).await?;
    Ok(Json(CreateUploadResponse {
        media_id,
        upload_url,
        public_url,
    }))
}

/// Marks a verified direct media upload as complete.
async fn complete_upload(
    State(app_state): State<AppState>,
    user: AuthUser,
    Path(id): Path<Uuid>,
) -> RouteResult<Json<TweetMedia>> {
    require_tweet_access(&app_state, user.id).await?;
    let pending = sqlx::query_as::<_, PendingMedia>("select id, bucket_path from tweet_media where id = $1 and uploader_id = $2 and tweet_id is null and uploaded_at is null")
        .bind(id).bind(user.id).fetch_optional(&app_state.pool).await?.ok_or(RouteError::not_found("pending attachment not found"))?;
    let Some(size) = app_state
        .s3
        .tweet_size(&pending.bucket_path)
        .await
        .map_err(|error| RouteError::S3(error.to_string()))?
    else {
        return Err(RouteError::bad_request("attachment upload is incomplete"));
    };
    if size <= 0 || size > MAX_MEDIA_BYTES {
        return Err(RouteError::bad_request(
            "attachments must be 100 MB or smaller",
        ));
    }
    let media = sqlx::query_as::<_, TweetMedia>(
        "
        update tweet_media 
        set uploaded_at = now(), byte_size = $1 
        where id = $2 
        returning id, public_url, content_type, media_kind, coalesce(position, 0) as position"
    )
        .bind(size)
        .bind(pending.id)
        .fetch_one(&app_state.pool).await?;
    Ok(Json(media))
}

/// Holds storage metadata for a pending attachment.
#[derive(FromRow)]
struct PendingMedia {
    id: Uuid,
    bucket_path: String,
}

/// Requires tweet-publishing access for a protected route.
async fn require_tweet_access(app_state: &AppState, user_id: Uuid) -> RouteResult<()> {
    if is_tweet(&app_state.pool, user_id).await? {
        Ok(())
    } else {
        Err(RouteError::forbidden("tweet access required"))
    }
}

/// Normalizes tags and preserves their first-seen order.
fn normalize_tags(tags: Vec<String>) -> Vec<String> {
    let mut normalized = Vec::new();
    for tag in tags {
        let tag: String = tag.to_lowercase().split_whitespace().collect();
        if !tag.is_empty() && !normalized.contains(&tag) {
            normalized.push(tag);
        }
    }
    normalized
}

#[cfg(test)]
#[path = "../../tests/unit/routes/tweets.rs"]
mod tests;
