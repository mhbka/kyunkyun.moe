use chrono::{DateTime, Utc};
use serde::Serialize;

use super::{pix::Pix, posts::PostSummary, tweets::Tweet};

/// Contains the content displayed by the home page.
#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Latest {
    pub pix: Vec<Pix>,
    pub post: Option<PostSummary>,
    pub tweet: Option<Tweet>,
    pub generated_at: DateTime<Utc>,
}
