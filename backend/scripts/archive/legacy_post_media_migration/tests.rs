// Restore this beside the command's test module before running these tests.
use super::*;

const POST_ID: &str = "0fc63797-fdce-4058-a1d1-4391e409aab8";
const IMAGE_ID: &str = "74cb137d-1ac3-46d7-a1e0-c4a243a54fea";
const VIDEO_ID: &str = "1082558d-5e89-4092-bdf7-be5815c34f32";
const ORIGIN: &str = "https://blogmedia.kyunkyun.moe";

/// Builds a stable legacy URL for migration tests.
fn legacy_url(media_id: &str, extension: &str) -> String {
    format!("{ORIGIN}/post-images/{POST_ID}/{media_id}.{extension}")
}

#[test]
fn parses_dry_run_and_single_post_arguments() {
    let post_id: Uuid = POST_ID.parse().unwrap();
    let arguments = parse_arguments(["--post".to_owned(), POST_ID.to_owned()]).unwrap();

    assert_eq!(
        arguments,
        Arguments {
            apply: false,
            post_id: Some(post_id),
        }
    );
    assert_eq!(
        parse_arguments(["--apply".to_owned()]).unwrap(),
        Arguments {
            apply: true,
            post_id: None,
        }
    );
}

#[test]
fn plans_gallery_images_and_videos_without_touching_normal_links() {
    let image_url = legacy_url(IMAGE_ID, "jpg");
    let video_url = legacy_url(VIDEO_ID, "mp4");
    let markdown = format!(
        "[ordinary link]({image_url})\n\n:::gallery{{caption=\"Cars\"}}\n\
         ::pic{{src=\"{image_url}\"}}\n\n\
         ::pic{{src=\"{video_url}\" caption=\"Runway\"}}\n:::\n"
    );

    let plan = build_plan(POST_ID.parse().unwrap(), &markdown, ORIGIN).unwrap();
    let rewritten = rewrite_markdown(&markdown, &plan.replacements);

    assert_eq!(plan.media.len(), 2);
    assert_eq!(plan.replacements.len(), 2);
    assert!(rewritten.contains(&format!("[ordinary link]({image_url})")));
    assert!(rewritten.contains(&format!("src=\"media:{IMAGE_ID}\"")));
    assert!(rewritten.contains(&format!("src=\"media:{VIDEO_ID}\" caption")));
    assert_eq!(
        plan.media[1].bucket_key,
        format!("post-videos-original/{POST_ID}/{VIDEO_ID}.mp4")
    );
}

#[test]
fn plans_standard_markdown_images_and_preserves_surrounding_text() {
    let image_url = legacy_url(IMAGE_ID, "png");
    let markdown = format!("Before\n\n![A caption]({image_url} \"Title\")\n\nAfter");

    let plan = build_plan(POST_ID.parse().unwrap(), &markdown, ORIGIN).unwrap();
    let rewritten = rewrite_markdown(&markdown, &plan.replacements);

    assert_eq!(plan.media.len(), 1);
    assert_eq!(
        rewritten,
        format!("Before\n\n![A caption](media:{IMAGE_ID} \"Title\")\n\nAfter")
    );
}

#[test]
fn does_not_mistake_a_link_after_an_image_for_an_image_source() {
    let image_url = legacy_url(IMAGE_ID, "jpg");
    let markdown = format!("![External](https://example.test/image.jpg) [File]({image_url})");

    let plan = build_plan(POST_ID.parse().unwrap(), &markdown, ORIGIN).unwrap();

    assert!(plan.media.is_empty());
    assert!(plan.replacements.is_empty());
}

#[test]
fn rejects_media_owned_by_another_post() {
    let other_post = "550e8400-e29b-41d4-a716-446655440000";
    let url = format!("{ORIGIN}/post-images/{other_post}/{IMAGE_ID}.jpg");
    let markdown = format!("::pic{{src=\"{url}\"}}");

    let error = build_plan(POST_ID.parse().unwrap(), &markdown, ORIGIN).unwrap_err();

    assert!(error
        .to_string()
        .contains("contains managed media owned by"));
}
