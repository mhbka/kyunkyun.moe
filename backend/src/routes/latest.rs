use axum::{extract::State, routing::get, Json, Router};
use chrono::{DateTime, Utc};
use sqlx::FromRow;
use uuid::Uuid;

use crate::{
    models::{
        latest::Latest,
        pix::Pix,
        posts::PostSummary,
        tweets::{Tweet, TweetMedia},
    },
    routes::error::RouteResult,
    state::AppState,
};

const LATEST_PIX_COUNT: i64 = 4;

/// Builds the cached home-page content route.
pub fn router() -> Router<AppState> {
    Router::new().route("/", get(get_latest))
}

/// Represents the newest tweet before its media is loaded.
#[derive(FromRow)]
struct LatestTweetRow {
    id: Uuid,
    author_id: Uuid,
    body: String,
    tags: Vec<String>,
    created_at: DateTime<Utc>,
}

/// Returns the cached home-page snapshot or rebuilds it after invalidation.
async fn get_latest(State(app_state): State<AppState>) -> RouteResult<Json<Latest>> {
    let mut cache = app_state.latest_cache().await;
    if let Some(latest) = cache.get() {
        return Ok(Json(latest));
    }

    let (pix, post, tweet) = tokio::try_join!(
        load_latest_pix(&app_state),
        load_latest_post(&app_state),
        load_latest_tweet(&app_state),
    )?;
    let latest = Latest {
        pix,
        post,
        tweet,
        generated_at: Utc::now(),
    };
    cache.store(latest.clone());

    Ok(Json(latest))
}

/// Loads the four newest completed Pix images.
async fn load_latest_pix(app_state: &AppState) -> Result<Vec<Pix>, sqlx::Error> {
    sqlx::query_as::<_, Pix>(
        "select id, public_url, tags, created_at from pix
         where uploaded_at is not null
         order by created_at desc, id desc limit $1",
    )
    .bind(LATEST_PIX_COUNT)
    .fetch_all(&app_state.pool)
    .await
}

/// Loads the newest currently published blog post.
async fn load_latest_post(app_state: &AppState) -> Result<Option<PostSummary>, sqlx::Error> {
    sqlx::query_as::<_, PostSummary>(
        "select id, title, slug, thumbnail_url, tags, published_at, updated_at
         from posts
         where status = 'published' and published_at <= now() and deleted_at is null
         order by published_at desc, id desc limit 1",
    )
    .fetch_optional(&app_state.pool)
    .await
}

/// Loads the newest public tweet and its completed media.
async fn load_latest_tweet(app_state: &AppState) -> Result<Option<Tweet>, sqlx::Error> {
    let row = sqlx::query_as::<_, LatestTweetRow>(
        "select id, author_id, body, tags, created_at from tweets
         where deleted_at is null order by created_at desc, id desc limit 1",
    )
    .fetch_optional(&app_state.pool)
    .await?;
    let Some(row) = row else {
        return Ok(None);
    };
    let media = sqlx::query_as::<_, TweetMedia>(
        "select id, public_url, content_type, media_kind, position from tweet_media
         where tweet_id = $1 and uploaded_at is not null order by position",
    )
    .bind(row.id)
    .fetch_all(&app_state.pool)
    .await?;

    Ok(Some(Tweet {
        id: row.id,
        author_id: row.author_id,
        body: row.body,
        tags: row.tags,
        created_at: row.created_at,
        media,
    }))
}

#[cfg(test)]
#[path = "../../tests/unit/routes/latest.rs"]
mod tests;
