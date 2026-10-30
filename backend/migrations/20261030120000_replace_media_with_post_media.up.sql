-- Blog media belongs to one post and is referenced from that post's Markdown by ID.
drop table media;

create table post_media (
  id                    uuid primary key default gen_random_uuid(),
  post_id               uuid not null references posts(id) on delete cascade,
  media_kind            text not null check (media_kind in ('image', 'video')),
  status                text not null default 'pending'
                          check (status in ('pending', 'uploaded', 'processing', 'ready', 'failed')),
  source_bucket_path    text not null unique,
  source_content_type   text not null,
  source_byte_size      bigint check (source_byte_size > 0),
  output_bucket_path    text unique,
  poster_bucket_path    text unique,
  content_type          text,
  byte_size             bigint check (byte_size > 0),
  width                 integer check (width > 0),
  height                integer check (height > 0),
  duration_ms           bigint check (duration_ms >= 0),
  is_referenced         boolean not null default false,
  processing_error      text,
  processing_attempts   integer not null default 0 check (processing_attempts >= 0),
  uploaded_at           timestamptz,
  processing_started_at timestamptz,
  ready_at              timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index idx_post_media_post on post_media (post_id, created_at);
create index idx_post_media_referenced on post_media (post_id, id)
  where is_referenced;
create index idx_post_media_processing on post_media (status, created_at)
  where status in ('uploaded', 'processing');

create trigger trg_post_media_updated_at
  before update on post_media
  for each row execute function set_updated_at();
