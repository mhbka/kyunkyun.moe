drop index if exists idx_video_processing_pending;
drop index if exists idx_post_media_processing;

alter table post_media
  drop constraint post_media_dimensions_check,
  drop constraint post_media_status_check,
  add constraint post_media_status_check
    check (status in ('pending', 'uploaded', 'processing', 'ready', 'failed')),
  add column source_content_type text,
  add column source_byte_size bigint check (source_byte_size > 0),
  add column output_bucket_path text unique,
  add column poster_bucket_path text unique,
  add column byte_size bigint check (byte_size > 0),
  add column duration_ms bigint check (duration_ms >= 0),
  add column is_referenced boolean not null default false,
  add column processing_error text,
  add column processing_attempts integer not null default 0 check (processing_attempts >= 0),
  add column uploaded_at timestamptz,
  add column processing_started_at timestamptz,
  add column ready_at timestamptz,
  add column updated_at timestamptz not null default now();

update post_media
set source_content_type = content_type,
    output_bucket_path = case when status = 'ready' then bucket_path end,
    uploaded_at = case when status <> 'pending' then created_at end,
    processing_started_at = case when status = 'processing' then created_at end,
    ready_at = case when status = 'ready' then created_at end;

update post_media as video
set poster_bucket_path = poster.bucket_path
from post_media as poster
where video.video_poster_id = poster.id;

update post_media as media
set processing_attempts = processing.attempts,
    processing_error = processing.error,
    duration_ms = processing.duration_ms,
    processing_started_at = processing.started_at,
    ready_at = coalesce(processing.completed_at, media.ready_at)
from video_processing as processing
where processing.media_type = 'post' and processing.media_id = media.id;

alter table post_media
  alter column source_content_type set not null,
  drop column video_poster_id;

alter table post_media rename column bucket_path to source_bucket_path;

alter table post_media
  rename constraint post_media_bucket_path_key to post_media_source_bucket_path_key;

create index idx_post_media_referenced on post_media (post_id, id)
  where is_referenced;
create index idx_post_media_processing on post_media (status, created_at)
  where status in ('uploaded', 'processing');

create trigger trg_post_media_updated_at
  before update on post_media
  for each row execute function set_updated_at();

drop table video_processing;
