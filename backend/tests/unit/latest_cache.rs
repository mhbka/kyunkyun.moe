use std::time::Duration;

use chrono::Utc;

use crate::{latest_cache::LatestCache, models::latest::Latest};

/// Creates an empty snapshot suitable for cache behavior tests.
fn latest() -> Latest {
    Latest {
        pix: vec![],
        post: None,
        tweet: None,
        generated_at: Utc::now(),
    }
}

#[test]
fn stores_and_invalidates_a_snapshot() {
    let mut cache = LatestCache::new(Duration::from_secs(60));
    cache.store(latest());
    assert!(cache.get().is_some());

    cache.invalidate();
    assert!(cache.get().is_none());
}

#[test]
fn rejects_an_immediately_expired_snapshot() {
    let mut cache = LatestCache::new(Duration::ZERO);
    cache.store(latest());

    assert!(cache.get().is_none());
}
