# Blog media refactor

Temporary implementation tracker for replacing inline blog-media URLs with stable media IDs.

## Decisions

- Keep blog media separate from tweet media.
- Store blog media directly in `post_media`; each item belongs to exactly one post.
- Store stable media IDs in Markdown and resolve them through a media map returned with the post.
- Keep captions and alt text in Markdown; keep dimensions and generated-object metadata in `post_media`.
- Keep `post_media` focused on display metadata and store shared video-job history in `video_processing`.
- Store generated video posters as image rows referenced by `video_poster_id`.
- Preserve legacy URL-based Markdown while existing posts are migrated.
- Store managed references as `media:<uuid>` in existing Markdown URL and `src` fields.
- Resolve references at the Markdown AST and Milkdown view boundaries; never persist resolved URLs.
- Read intrinsic image dimensions before direct upload and validate them in the media API.
- Treat completed raw videos as ready for preview and publishing; track optimization only in `video_processing`.
- Upload new raw videos under `post-videos-original`, while retaining existing stored original paths, then switch `post_media.bucket_path` to a new processed-object key.
- Upload new generated video posters under `post-videos-posters`, while retaining existing stored poster paths.
- Optimize videos as H.264/AAC MP4 with fast-start, never upscale, and cap output width at 2560 pixels.
- Do not automatically delete unused media until post-revision retention is handled.

## Stable Markdown references

- [x] Add shared helpers for building, parsing, and resolving `media:<uuid>` references.
- [x] Resolve standard images through the post media map before responsive-image rendering.
- [x] Resolve gallery and video directives with dimensions and generated video posters.
- [x] Pass each post's media map into published and author-preview rendering.
- [x] Insert stable references from Milkdown uploads while resolving URLs only in node views.
- [x] Keep legacy and external URL-based images, galleries, and videos unchanged.
- [x] Render missing, unavailable, or mismatched managed media as a safe placeholder.
- [x] Cover reference helpers, rendering, and editor resolution with focused unit tests.

Crepe currently stores its image-block resize ratio in the Markdown image's `alt`
slot. This step preserves that existing behavior; database dimensions drive published
layout placeholders, while standalone-image alt/resize cleanup remains a separate
editor concern.

## Progress

- [x] Replace the unused `media` table with the post-owned `post_media` schema.
- [x] Add media upload, completion, lookup, and processing-state endpoints.
- [x] Save the editor's media IDs transactionally and return referenced media as a lookup map.
- [x] Track uploaded media separately in the editor while retaining URL-based Markdown.
- [x] Resolve media IDs, dimensions, and posters in published and preview rendering.
- [x] Update Milkdown image, gallery, and video nodes to store media IDs.
- [x] Add the single-concurrency FFmpeg worker and poster generation.
  - [x] Claim pending jobs atomically and recover jobs abandoned during a restart.
  - [x] Download originals to temporary files and inspect them with FFprobe.
  - [x] Encode immutable H.264/AAC MP4 outputs capped at 2560px without upscaling.
  - [x] Generate and upload JPEG posters as ready `post_media` image rows.
  - [x] Update the logical video row and complete the job in one database transaction.
  - [x] Keep raw videos usable on failure and retry processing a limited number of times.
  - [x] Run one worker at a time and stop it cleanly with the HTTP server.
  - [x] Install FFmpeg in the production backend image and cover the worker with focused tests.
- [ ] Add compatibility-first tooling for migrating existing URL-based Markdown.
- [ ] Decide how revision media references participate in deletion, then add cleanup.
- [ ] Remove this tracker after the refactor is complete.

## Verification

- [x] Backend unit tests and all-target tests pass.
- [x] Frontend unit tests and Astro checks pass.
- [x] Backend and frontend production images build with FFmpeg available at runtime.
- [ ] Smoke-test a real uploaded video through R2, including its processed URL and poster.
