use super::{
    CreatePostRequest, DraftPostSummary, PostPage, PostStatus, PostSummary, UpdatePostRequest,
};
use chrono::Utc;
use uuid::Uuid;

/// Builds ordered summaries for pagination boundary tests.
fn summaries(count: usize) -> Vec<PostSummary> {
    (0..count)
        .map(|index| PostSummary {
            id: Uuid::from_u128(index as u128),
            title: format!("Post {index}"),
            slug: format!("post-{index}"),
            thumbnail_url: None,
            tags: vec![],
            published_at: Utc::now(),
            updated_at: Utc::now(),
        })
        .collect()
}

#[test]
fn trims_lookahead_and_reports_more_posts() {
    let page = PostPage::from_posts(summaries(21), 20);
    assert!(page.has_more);
    assert_eq!(page.posts.len(), 20);
    assert_eq!(page.posts.first().unwrap().id, Uuid::from_u128(0));
    assert_eq!(page.posts.last().unwrap().id, Uuid::from_u128(19));
}

#[test]
fn empty_partial_and_exact_pages_have_no_more_posts() {
    for count in [0, 7, 20] {
        let page = PostPage::from_posts(summaries(count), 20);
        assert!(!page.has_more);
        assert_eq!(page.posts.len(), count);
    }
}

#[test]
fn serializes_post_page_with_camel_case_metadata() {
    let json = serde_json::to_value(PostPage::from_posts(vec![], 20)).unwrap();
    assert_eq!(json, serde_json::json!({ "posts": [], "hasMore": false }));
}

#[test]
fn serializes_status_as_lowercase() {
    assert_eq!(
        serde_json::to_string(&PostStatus::Published).unwrap(),
        "\"published\""
    );
}

#[test]
fn rejects_unknown_statuses() {
    assert!(serde_json::from_str::<PostStatus>("\"scheduled\"").is_err());
}

#[test]
fn serializes_post_fields_as_camel_case() {
    let post = PostSummary {
        id: Uuid::nil(),
        title: "Hello".to_string(),
        slug: "hello".to_string(),
        thumbnail_url: Some("https://example.test/image.png".to_string()),
        tags: vec!["rust".to_string()],
        published_at: Utc::now(),
        updated_at: Utc::now(),
    };

    let json = serde_json::to_value(post).unwrap();
    assert_eq!(json["thumbnailUrl"], "https://example.test/image.png");
    assert_eq!(json["tags"], serde_json::json!(["rust"]));
    assert!(json.get("publishedAt").is_some());
    assert!(json.get("updatedAt").is_some());
    assert!(json.get("thumbnail_url").is_none());
}

#[test]
fn serializes_draft_summary_fields_as_camel_case() {
    let post = DraftPostSummary {
        id: Uuid::nil(),
        title: "Draft".to_string(),
        slug: "draft".to_string(),
        thumbnail_url: None,
        tags: vec!["astro".to_string()],
        updated_at: Utc::now(),
    };

    let json = serde_json::to_value(post).unwrap();
    assert!(json.get("updatedAt").is_some());
    assert!(json.get("updated_at").is_none());
    assert_eq!(json["tags"], serde_json::json!(["astro"]));
}

#[test]
fn deserializes_post_requests_from_camel_case() {
    let request: UpdatePostRequest = serde_json::from_value(serde_json::json!({
        "contentMd": "Updated content",
        "thumbnailUrl": "https://example.test/image.png",
        "tags": ["rust"]
    }))
    .unwrap();

    assert_eq!(request.content_md.as_deref(), Some("Updated content"));
    assert_eq!(
        request.thumbnail_url.as_deref(),
        Some("https://example.test/image.png")
    );
    assert_eq!(request.slug, None);
    assert_eq!(request.tags, Some(vec!["rust".to_string()]));
}

#[test]
fn deserializes_optional_slug_from_camel_case_requests() {
    let request: CreatePostRequest = serde_json::from_value(serde_json::json!({
        "title": "Draft",
        "contentMd": "Content",
        "slug": "custom-draft",
        "tags": ["astro"]
    }))
    .unwrap();

    assert_eq!(request.slug.as_deref(), Some("custom-draft"));
    assert_eq!(request.tags, Some(vec!["astro".to_string()]));
}
