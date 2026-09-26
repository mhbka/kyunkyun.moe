use super::{tweet_media_extension, UploadUrls};

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
