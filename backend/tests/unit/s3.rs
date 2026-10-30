use super::{
    blogpost_media_key, blogpost_original_key, blogpost_poster_key, blogpost_processed_video_key,
    blogpost_upload_key, tweet_media_extension, UploadUrls,
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
        "post-videos-original/5fc70214-6c7c-49aa-be30-d2a60a70897c/ac28dd5d-3d55-4ce3-8b58-b39aca67a78e.webm"
    );
}

#[test]
fn keeps_original_videos_under_a_parallel_prefix() {
    assert_eq!(
        blogpost_original_key("post-images/post-id/media-id.mp4"),
        "post-videos-original/post-id/media-id.mp4"
    );
    assert_eq!(
        blogpost_original_key("post-videos-original/post-id/media-id.mp4"),
        "post-videos-original/post-id/media-id.mp4"
    );
    // Previously uploaded originals keep their stored legacy key.
    assert_eq!(
        blogpost_original_key("post-originals/post-id/media-id.mp4"),
        "post-originals/post-id/media-id.mp4"
    );
}

#[test]
fn builds_immutable_processed_video_and_poster_keys() {
    let post_id = Uuid::parse_str("326ed3d2-a437-4552-91f8-fb726736de63").unwrap();
    let media_id = Uuid::parse_str("98af781e-82d7-4d26-a80c-cd68360eb473").unwrap();
    let processing_id = Uuid::parse_str("3d26e46b-d49d-4abe-98c2-3cb7f7fe81b6").unwrap();
    let poster_id = Uuid::parse_str("f5e36c65-b879-4a94-99f2-fbf28c2867cf").unwrap();

    assert_eq!(
        blogpost_processed_video_key(post_id, media_id, processing_id),
        "post-videos/326ed3d2-a437-4552-91f8-fb726736de63/98af781e-82d7-4d26-a80c-cd68360eb473-3d26e46b-d49d-4abe-98c2-3cb7f7fe81b6.mp4"
    );
    assert_eq!(
        blogpost_poster_key(post_id, poster_id),
        "post-videos-posters/326ed3d2-a437-4552-91f8-fb726736de63/f5e36c65-b879-4a94-99f2-fbf28c2867cf.jpg"
    );
}
