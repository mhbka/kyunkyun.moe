use axum::{
    body::Body,
    http::{Request, StatusCode},
    routing::{get, post},
    Router,
};
use tower::ServiceExt;

use crate::models::media::PostMediaKind;

use super::{media_kind_for_content_type, upload_dimensions, CreateUploadResponse};

#[test]
fn serializes_upload_response_with_a_stable_media_id() {
    let response = CreateUploadResponse {
        media_id: uuid::Uuid::nil(),
        upload_url: "upload".into(),
        public_url: "public".into(),
    };

    assert_eq!(
        serde_json::to_value(response).unwrap(),
        serde_json::json!({
            "mediaId": uuid::Uuid::nil(),
            "uploadUrl": "upload",
            "publicUrl": "public"
        })
    );
}

#[test]
fn identifies_supported_post_media_types() {
    assert_eq!(
        media_kind_for_content_type("image/png"),
        Some(PostMediaKind::Image)
    );
    assert_eq!(
        media_kind_for_content_type("video/mp4"),
        Some(PostMediaKind::Video)
    );
    assert_eq!(media_kind_for_content_type("audio/mpeg"), None);
}

#[test]
fn accepts_complete_image_dimensions_only() {
    assert_eq!(
        upload_dimensions(PostMediaKind::Image, Some(1600), Some(900)).unwrap(),
        (Some(1600), Some(900))
    );
    assert!(upload_dimensions(PostMediaKind::Image, Some(1600), None).is_err());
    assert!(upload_dimensions(PostMediaKind::Video, Some(1920), Some(1080)).is_err());
}

#[tokio::test]
async fn media_routes_match_uuid_paths() {
    let router = Router::new()
        .route("/uploads/{id}/complete", post(|| async { StatusCode::OK }))
        .route("/{id}", get(|| async { StatusCode::OK }));
    let id = "f2c6e5e4-29ef-4dce-896e-3ea8a2e9507d";

    let complete = router
        .clone()
        .oneshot(
            Request::post(format!("/uploads/{id}/complete"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    let lookup = router
        .oneshot(Request::get(format!("/{id}")).body(Body::empty()).unwrap())
        .await
        .unwrap();

    assert_eq!(complete.status(), StatusCode::OK);
    assert_eq!(lookup.status(), StatusCode::OK);
}
