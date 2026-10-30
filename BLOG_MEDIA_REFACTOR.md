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
- Do not automatically delete unused media until post-revision retention is handled.

## Progress

- [x] Replace the unused `media` table with the post-owned `post_media` schema.
- [x] Add media upload, completion, lookup, and processing-state endpoints.
- [x] Save the editor's media IDs transactionally and return referenced media as a lookup map.
- [x] Track uploaded media separately in the editor while retaining URL-based Markdown.
- [ ] Resolve media IDs, dimensions, and posters in published and preview rendering.
- [ ] Update Milkdown image, gallery, and video nodes to store media IDs.
- [ ] Add the single-concurrency FFmpeg worker and poster generation.
- [ ] Add compatibility-first tooling for migrating existing URL-based Markdown.
- [ ] Decide how revision media references participate in deletion, then add cleanup.
- [ ] Remove this tracker after the refactor is complete.

## Verification

- [x] Backend unit tests and all-target tests pass.
- [x] Frontend unit tests and Astro checks pass.
- [ ] Backend and frontend production images build with FFmpeg available at runtime.
