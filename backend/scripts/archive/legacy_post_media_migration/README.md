# Legacy post-media migration

This one-off command migrated active posts from inline `post-images` URLs to
stable `media:<uuid>` references. It also moved original videos into
`post-videos-original`, registered media metadata, and queued video processing.

The site-wide migration completed successfully in October 2026. The command is
archived so it is not built or shipped with the backend during normal work.

## Restoring the command

1. Move `migrate_legacy_post_media.rs` to
   `backend/src/bin/migrate_legacy_post_media.rs`.
2. Move `tests.rs` to
   `backend/tests/unit/bin/migrate_legacy_post_media.rs`.
3. Restore the following test module at the end of the command source:

   ```rust
   #[cfg(test)]
   #[path = "../../tests/unit/bin/migrate_legacy_post_media.rs"]
   mod tests;
   ```

4. Add `regex = "1"` to `backend/Cargo.toml` dependencies.
5. Run `cargo test --bin migrate_legacy_post_media` before using it.

The command defaults to dry-run. A single-post trial uses:

```sh
cargo run --bin migrate_legacy_post_media -- --post <post-uuid>
cargo run --bin migrate_legacy_post_media -- --post <post-uuid> --apply
```

FFmpeg and `ffprobe` must be installed locally.
