-- Restore the broader status vocabulary used before processing was separated.
alter table post_media
  drop constraint post_media_status_check,
  add constraint post_media_status_check
    check (status in ('pending', 'processing', 'ready', 'failed'));

create index idx_post_media_processing on post_media (status, created_at)
  where status = 'processing';
