-- Keep display metadata on post_media and move video-job details into their own table.
drop trigger if exists trg_post_media_updated_at on post_media;
drop index if exists idx_post_media_referenced;
drop index if exists idx_post_media_processing;

update post_media
set content_type = coalesce(content_type, source_content_type),
    status = case when status = 'uploaded' then 'processing' else status end;

alter table post_media drop constraint post_media_status_check;
alter table post_media rename column source_bucket_path to bucket_path;

alter table post_media
  rename constraint post_media_source_bucket_path_key to post_media_bucket_path_key;

alter table post_media
  alter column content_type set not null,
  add column video_poster_id uuid references post_media(id) on delete set null,
  add constraint post_media_status_check
    check (status in ('pending', 'processing', 'ready', 'failed')),
  add constraint post_media_dimensions_check
    check ((width is null) = (height is null)),
  drop column source_content_type,
  drop column source_byte_size,
  drop column output_bucket_path,
  drop column poster_bucket_path,
  drop column byte_size,
  drop column duration_ms,
  drop column is_referenced,
  drop column processing_error,
  drop column processing_attempts,
  drop column uploaded_at,
  drop column processing_started_at,
  drop column ready_at,
  drop column updated_at;

create index idx_post_media_processing on post_media (status, created_at)
  where status = 'processing';

create table video_processing (
  id                   uuid primary key default gen_random_uuid(),
  media_type           text not null,
  media_id             uuid not null,
  original_bucket_path text not null unique,
  status               text not null default 'pending'
                         check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts             integer not null default 0 check (attempts >= 0),
  error                text,
  duration_ms          bigint check (duration_ms >= 0),
  started_at           timestamptz,
  completed_at         timestamptz,
  created_at           timestamptz not null default now(),
  unique (media_type, media_id)
);

create index idx_video_processing_pending on video_processing (status, created_at)
  where status in ('pending', 'processing');
