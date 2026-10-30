use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use uuid::Uuid;

/// Identifies how a blog media item is rendered.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize, sqlx::Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "text", rename_all = "lowercase")]
pub enum PostMediaKind {
    Image,
    Video,
}

/// Tracks whether a blog media upload can be displayed.
#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize, sqlx::Type)]
#[serde(rename_all = "lowercase")]
#[sqlx(type_name = "text", rename_all = "lowercase")]
pub enum PostMediaStatus {
    Pending,
    Ready,
}

/// Describes one post-owned media item returned by the API.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PostMedia {
    pub id: Uuid,
    pub post_id: Uuid,
    pub media_kind: PostMediaKind,
    pub status: PostMediaStatus,
    pub public_url: Option<String>,
    pub video_poster_id: Option<Uuid>,
    pub poster_url: Option<String>,
    pub content_type: String,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub created_at: DateTime<Utc>,
}

#[cfg(test)]
#[path = "../../tests/unit/models/media.rs"]
mod tests;
