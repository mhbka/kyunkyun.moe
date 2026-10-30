-- Completed raw videos are display-ready; optimization is tracked separately.
update video_processing as processing
set original_bucket_path = media.bucket_path
from post_media as media
where processing.media_type = 'post'
  and processing.media_id = media.id
  and media.media_kind = 'video'
  and media.bucket_path not like 'post-originals/%';

update post_media
set status = 'ready'
where status in ('processing', 'failed');

drop index if exists idx_post_media_processing;

alter table post_media
  drop constraint post_media_status_check,
  add constraint post_media_status_check
    check (status in ('pending', 'ready'));
