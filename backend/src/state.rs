use sqlx::{Pool, Postgres};
use std::{sync::Arc, time::Duration};
use tokio::sync::{Mutex, MutexGuard};

use crate::{auth::CachedJwkSet, latest_cache::LatestCache, s3::S3};

const LATEST_CACHE_TTL: Duration = Duration::from_secs(10 * 60);

/// State used by routes.
#[derive(Debug, Clone)]
pub struct AppState {
    pub pool: Pool<Postgres>,
    pub s3: S3,
    jwkset: Arc<Mutex<CachedJwkSet>>,
    latest: Arc<Mutex<LatestCache>>,
}

impl AppState {
    /// Creates the shared state required by every route.
    pub async fn new(
        pool: Pool<Postgres>,
        s3_account_id: String,
        s3_access_key_id: String,
        s3_access_key_secret: String,
        s3_blogpost_bucket_name: String,
        s3_blogpost_bucket_url: String,
        s3_pix_bucket_name: String,
        s3_pix_bucket_url: String,
        s3_tweet_bucket_name: String,
        s3_tweet_bucket_url: String,
    ) -> Self {
        let s3 = S3::new(
            s3_account_id,
            s3_access_key_id,
            s3_access_key_secret,
            s3_blogpost_bucket_name,
            s3_blogpost_bucket_url,
            s3_pix_bucket_name,
            s3_pix_bucket_url,
            s3_tweet_bucket_name,
            s3_tweet_bucket_url,
        )
        .await;
        Self {
            pool,
            s3,
            jwkset: Arc::new(Mutex::new(CachedJwkSet::new())),
            latest: Arc::new(Mutex::new(LatestCache::new(LATEST_CACHE_TTL))),
        }
    }

    /// Locks the cached JWK set for authentication updates.
    pub async fn jwkset(&self) -> MutexGuard<'_, CachedJwkSet> {
        self.jwkset.lock().await
    }

    /// Locks the home-page snapshot while it is read or rebuilt.
    pub async fn latest_cache(&self) -> MutexGuard<'_, LatestCache> {
        self.latest.lock().await
    }

    /// Invalidates home-page data after a successful public content change.
    pub async fn invalidate_latest(&self) {
        self.latest.lock().await.invalidate();
    }
}
