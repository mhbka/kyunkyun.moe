-- Track the media collection saved by the editor with database-enforced ownership.
alter table post_media
  add constraint post_media_post_id_id_key unique (post_id, id);

create table post_media_references (
  post_id  uuid not null,
  media_id uuid not null,
  primary key (post_id, media_id),
  foreign key (post_id, media_id)
    references post_media (post_id, id) on delete cascade
);

-- Preserve any media uploaded before explicit editor tracking was introduced.
insert into post_media_references (post_id, media_id)
select post_id, id from post_media;
