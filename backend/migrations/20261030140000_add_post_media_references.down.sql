-- Remove editor media tracking while leaving uploaded media intact.
drop table post_media_references;

alter table post_media
  drop constraint post_media_post_id_id_key;
