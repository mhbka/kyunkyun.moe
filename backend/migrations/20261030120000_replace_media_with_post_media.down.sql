drop table if exists post_media;

-- Restore the original unused media table when rolling the migration back.
create table media (
  id          uuid primary key default gen_random_uuid(),
  uploader_id uuid not null references auth.users(id) on delete cascade,
  bucket_path text not null,
  public_url  text not null,
  content_type text,
  created_at  timestamptz not null default now()
);
