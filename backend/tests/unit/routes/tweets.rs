use super::{normalize_tags, CreateUploadResponse};
use crate::models::tweets::TweetMedia;
use uuid::Uuid;

#[test]
fn normalizes_tweet_tags() {
    assert_eq!(
        normalize_tags(vec![" Cats ".into(), "cats".into(), "".into()]),
        vec!["cats"]
    );
}

#[test]
fn serializes_tweet_upload_response_as_camel_case() {
    let response = CreateUploadResponse {
        media_id: Uuid::nil(),
        upload_url: "upload".into(),
        public_url: "public".into(),
    };
    assert_eq!(
        serde_json::to_value(response).unwrap(),
        serde_json::json!({
            "mediaId": Uuid::nil(), "uploadUrl": "upload", "publicUrl": "public"
        })
    );
}

#[test]
fn serializes_integer_media_position() {
    let media = TweetMedia {
        id: Uuid::nil(),
        public_url: "public".into(),
        content_type: "image/png".into(),
        media_kind: "image".into(),
        position: 32_768,
    };
    assert_eq!(serde_json::to_value(media).unwrap()["position"], 32_768);
}
