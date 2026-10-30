use std::{path::Path, time::Duration};

use anyhow::{anyhow, Context};
use sqlx::{FromRow, PgPool};
use tokio::{sync::watch, time::sleep};
use uuid::Uuid;

use crate::{
    s3::{blogpost_poster_key, blogpost_processed_video_key},
    state::AppState,
};

use super::ffmpeg::{self, VideoMetadata};

const IDLE_POLL_INTERVAL: Duration = Duration::from_secs(10);
const FAILURE_RETRY_INTERVAL: Duration = Duration::from_secs(30);
const MAX_ATTEMPTS: i32 = 3;

/// Contains one atomically claimed post-video processing job.
#[derive(Debug, FromRow)]
struct VideoJob {
    id: Uuid,
    media_id: Uuid,
    original_bucket_path: String,
    attempts: i32,
}

/// Contains the post ownership needed for generated storage keys.
#[derive(Debug, FromRow)]
struct PostVideo {
    post_id: Uuid,
}

/// Runs post-video processing one job at a time until shutdown.
pub async fn run(app_state: AppState, mut shutdown: watch::Receiver<bool>) {
    tracing::info!("video-processing worker started");
    loop {
        if *shutdown.borrow() {
            break;
        }

        let delay = match process_next(&app_state).await {
            Ok(true) => Duration::ZERO,
            Ok(false) => IDLE_POLL_INTERVAL,
            Err(error) => {
                tracing::error!(%error, "video-processing worker iteration failed");
                FAILURE_RETRY_INTERVAL
            }
        };

        // Wake promptly on shutdown while otherwise respecting the polling delay.
        tokio::select! {
            _ = sleep(delay) => {}
            result = shutdown.changed() => {
                if result.is_err() || *shutdown.borrow() {
                    break;
                }
            }
        }
    }
    tracing::info!("video-processing worker stopped");
}

/// Claims and processes at most one pending post-video job.
async fn process_next(app_state: &AppState) -> anyhow::Result<bool> {
    let Some(job) = claim_job(&app_state.pool).await? else {
        return Ok(false);
    };
    tracing::info!(job_id = %job.id, media_id = %job.media_id, attempt = job.attempts, "processing video");

    if let Err(error) = process_job(app_state, &job).await {
        let error_text = format!("{error:#}");
        record_failure(&app_state.pool, &job, &error_text).await?;
        tracing::warn!(job_id = %job.id, media_id = %job.media_id, error = %error_text, "video processing failed");
    }
    Ok(true)
}

/// Claims the oldest pending job or a job abandoned by a dead worker.
async fn claim_job(pool: &PgPool) -> anyhow::Result<Option<VideoJob>> {
    // Exhaust jobs whose final attempt was interrupted before another claim.
    sqlx::query(
        "update video_processing
         set status = 'failed', error = 'final processing attempt was interrupted',
             started_at = null
         where media_type = 'post' and status = 'processing'
           and attempts >= $1 and started_at < now() - interval '6 hours'",
    )
    .bind(MAX_ATTEMPTS)
    .execute(pool)
    .await
    .context("failed to recover exhausted video-processing jobs")?;

    sqlx::query_as::<_, VideoJob>(
        "with candidate as (
            select id
            from video_processing
            where media_type = 'post'
              and attempts < $1
              and (
                status = 'pending'
                or (status = 'processing' and started_at < now() - interval '6 hours')
              )
            order by created_at
            for update skip locked
            limit 1
         )
         update video_processing processing
         set status = 'processing', attempts = attempts + 1,
             error = null, started_at = now(), completed_at = null
         from candidate
         where processing.id = candidate.id
         returning processing.id, processing.media_id,
             processing.original_bucket_path, processing.attempts",
    )
    .bind(MAX_ATTEMPTS)
    .fetch_optional(pool)
    .await
    .context("failed to claim video-processing job")
}

/// Produces and publishes both generated objects before changing database pointers.
async fn process_job(app_state: &AppState, job: &VideoJob) -> anyhow::Result<()> {
    let video = sqlx::query_as::<_, PostVideo>(
        "select post_id from post_media where id = $1 and media_kind = 'video'",
    )
    .bind(job.media_id)
    .fetch_optional(&app_state.pool)
    .await?
    .ok_or_else(|| anyhow!("post video no longer exists"))?;

    let temp_directory = tempfile::tempdir().context("failed to create processing directory")?;
    let input_path = temp_directory.path().join("original");
    let output_path = temp_directory.path().join("processed.mp4");
    let poster_path = temp_directory.path().join("poster.jpg");

    app_state
        .s3
        .download_blogpost_object(&job.original_bucket_path, &input_path)
        .await?;
    let metadata = ffmpeg::process(&input_path, &output_path, &poster_path).await?;

    let poster_id = Uuid::new_v4();
    let video_key = blogpost_processed_video_key(video.post_id, job.media_id, job.id);
    let poster_key = blogpost_poster_key(video.post_id, poster_id);
    upload_outputs(
        app_state,
        &video_key,
        &output_path,
        &poster_key,
        &poster_path,
    )
    .await?;
    complete_job(
        &app_state.pool,
        job,
        poster_id,
        &video_key,
        &poster_key,
        &metadata,
    )
    .await
}

/// Uploads generated objects under immutable keys.
async fn upload_outputs(
    app_state: &AppState,
    video_key: &str,
    video_path: &Path,
    poster_key: &str,
    poster_path: &Path,
) -> anyhow::Result<()> {
    app_state
        .s3
        .upload_blogpost_object(video_key, video_path, "video/mp4")
        .await?;
    app_state
        .s3
        .upload_blogpost_object(poster_key, poster_path, "image/jpeg")
        .await
}

/// Atomically installs generated metadata and marks the processing job complete.
async fn complete_job(
    pool: &PgPool,
    job: &VideoJob,
    poster_id: Uuid,
    video_key: &str,
    poster_key: &str,
    metadata: &VideoMetadata,
) -> anyhow::Result<()> {
    let mut transaction = pool.begin().await?;
    let post_id = sqlx::query_scalar::<_, Uuid>(
        "select post_id from post_media where id = $1 and media_kind = 'video' for update",
    )
    .bind(job.media_id)
    .fetch_optional(&mut *transaction)
    .await?
    .ok_or_else(|| anyhow!("post video no longer exists"))?;

    sqlx::query(
        "insert into post_media
         (id, post_id, media_kind, status, bucket_path, content_type, width, height)
         values ($1, $2, 'image', 'ready', $3, 'image/jpeg', $4, $5)",
    )
    .bind(poster_id)
    .bind(post_id)
    .bind(poster_key)
    .bind(metadata.width)
    .bind(metadata.height)
    .execute(&mut *transaction)
    .await?;
    sqlx::query(
        "update post_media
         set bucket_path = $1, content_type = 'video/mp4',
             width = $2, height = $3, video_poster_id = $4
         where id = $5",
    )
    .bind(video_key)
    .bind(metadata.width)
    .bind(metadata.height)
    .bind(poster_id)
    .bind(job.media_id)
    .execute(&mut *transaction)
    .await?;
    let completed = sqlx::query(
        "update video_processing
         set status = 'completed', error = null, duration_ms = $1, completed_at = now()
         where id = $2 and status = 'processing'",
    )
    .bind(metadata.duration_ms)
    .bind(job.id)
    .execute(&mut *transaction)
    .await?;
    if completed.rows_affected() != 1 {
        return Err(anyhow!("video-processing job is no longer claimed"));
    }
    transaction.commit().await?;
    Ok(())
}

/// Returns a failed job to the queue or exhausts it after the final attempt.
async fn record_failure(pool: &PgPool, job: &VideoJob, error: &str) -> anyhow::Result<()> {
    let status = failure_status(job.attempts);
    sqlx::query(
        "update video_processing
         set status = $1, error = $2, started_at = null
         where id = $3 and status = 'processing'",
    )
    .bind(status)
    .bind(error)
    .bind(job.id)
    .execute(pool)
    .await?;
    Ok(())
}

/// Selects whether another processing attempt remains.
fn failure_status(attempts: i32) -> &'static str {
    if attempts >= MAX_ATTEMPTS {
        "failed"
    } else {
        "pending"
    }
}

#[cfg(test)]
#[path = "../../tests/unit/video_processing/worker.rs"]
mod tests;
