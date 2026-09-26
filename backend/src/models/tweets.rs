use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// A media attachment displayed with a tweet.
#[derive(Debug, Serialize, sqlx::FromRow)]
#[serde(rename_all = "camelCase")]
pub struct TweetMedia {
    pub id: Uuid,
    pub public_url: String,
    pub content_type: String,
    pub media_kind: String,
    pub position: i32,
}

/// A public short-form post and its completed attachments.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tweet {
    pub id: Uuid,
    pub author_id: Uuid,
    pub body: String,
    pub tags: Vec<String>,
    pub created_at: DateTime<Utc>,
    pub media: Vec<TweetMedia>,
}

/// A cursor-paginated tweet timeline.
#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TweetPage {
    pub tweets: Vec<Tweet>,
    pub next_before: Option<Uuid>,
    pub has_more: bool,
}

/// Supplies a completed media batch for a newly published tweet.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTweetRequest {
    pub body: String,
    pub tags: Vec<String>,
    pub media_ids: Vec<Uuid>,
}
