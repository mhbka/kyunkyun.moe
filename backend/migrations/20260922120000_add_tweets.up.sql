alter table profiles
  add column is_tweet boolean not null default false;

create table tweets (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references auth.users(id) on delete cascade,
  body       text not null,
  tags       text[] not null default '{}',
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index idx_tweets_created on tweets (created_at desc, id desc)
  where deleted_at is null;
create index idx_tweets_tags on tweets using gin (tags);

create table tweet_media (
  id             uuid primary key,
  tweet_id       uuid references tweets(id) on delete cascade,
  uploader_id    uuid not null references auth.users(id) on delete cascade,
  bucket_path    text not null unique,
  public_url     text not null,
  content_type   text not null,
  media_kind     text not null check (media_kind in ('image', 'video')),
  byte_size      bigint not null check (byte_size > 0),
  position       integer,
  uploaded_at    timestamptz,
  created_at     timestamptz not null default now(),
  check ((tweet_id is null and position is null) or (tweet_id is not null and position is not null))
);

create index idx_tweet_media_tweet on tweet_media (tweet_id, position)
  where uploaded_at is not null;
