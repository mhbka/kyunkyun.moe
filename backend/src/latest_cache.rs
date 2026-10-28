use std::time::{Duration, Instant};

use crate::models::latest::Latest;

/// Keeps the latest home-page snapshot for a bounded amount of time.
#[derive(Debug)]
pub struct LatestCache {
    entry: Option<CacheEntry>,
    ttl: Duration,
}

/// Associates a home-page snapshot with its cache insertion time.
#[derive(Debug)]
struct CacheEntry {
    latest: Latest,
    stored_at: Instant,
}

impl LatestCache {
    /// Creates an empty cache with the supplied fallback lifetime.
    pub fn new(ttl: Duration) -> Self {
        Self { entry: None, ttl }
    }

    /// Returns a fresh snapshot without exposing the stored value for mutation.
    pub fn get(&self) -> Option<Latest> {
        let entry = self.entry.as_ref()?;
        (entry.stored_at.elapsed() < self.ttl).then(|| entry.latest.clone())
    }

    /// Replaces the cached snapshot with a newly generated value.
    pub fn store(&mut self, latest: Latest) {
        self.entry = Some(CacheEntry {
            latest,
            stored_at: Instant::now(),
        });
    }

    /// Removes any snapshot affected by a successful content mutation.
    pub fn invalidate(&mut self) {
        self.entry = None;
    }
}

#[cfg(test)]
#[path = "../tests/unit/latest_cache.rs"]
mod tests;
