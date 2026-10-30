use super::{
    blogpost_media_key, blogpost_original_key, blogpost_upload_key, tweet_media_extension,
    UploadUrls,
};
use uuid::Uuid;

#[test]
fn serializes_upload_urls_as_camel_case() {
    let urls = UploadUrls {
        upload_url: "https://storage.example.test/upload".to_string(),
        public_url: "https://images.example.test/image.png".to_string(),
    };

    assert_eq!(
        serde_json::to_value(urls).unwrap(),
        serde_json::json!({
            "uploadUrl": "https://storage.example.test/upload",
            "publicUrl": "https://images.example.test/image.png",
        })
    );
}

#[test]
fn recognizes_supported_tweet_media_types() {
    assert_eq!(tweet_media_extension("image/webp"), Some("webp"));
    assert_eq!(tweet_media_extension("video/mp4"), Some("mp4"));
    assert_eq!(tweet_media_extension("video/webm"), Some("webm"));
    assert_eq!(tweet_media_extension("video/quicktime"), None);
}

#[test]
fn builds_stable_blogpost_media_keys() {
    let post_id = Uuid::parse_str("5fc70214-6c7c-49aa-be30-d2a60a70897c").unwrap();
    let media_id = Uuid::parse_str("ac28dd5d-3d55-4ce3-8b58-b39aca67a78e").unwrap();

    assert_eq!(
        blogpost_media_key(post_id, media_id, "webp"),
        "post-images/5fc70214-6c7c-49aa-be30-d2a60a70897c/ac28dd5d-3d55-4ce3-8b58-b39aca67a78e.webp"
    );
    assert_eq!(
        blogpost_upload_key(post_id, media_id, "video/webm").unwrap(),
        "post-originals/5fc70214-6c7c-49aa-be30-d2a60a70897c/ac28dd5d-3d55-4ce3-8b58-b39aca67a78e.webm"
    );
}

#[test]
fn keeps_original_videos_under_a_parallel_prefix() {
    assert_eq!(
        blogpost_original_key("post-images/post-id/media-id.mp4"),
        "post-originals/post-id/media-id.mp4"
    );
    assert_eq!(
        blogpost_original_key("post-originals/post-id/media-id.mp4"),
        "post-originals/post-id/media-id.mp4"
    );
}
