use super::{PostMediaKind, PostMediaStatus};

#[test]
fn serializes_media_kinds_as_lowercase() {
    assert_eq!(
        serde_json::to_string(&PostMediaKind::Video).unwrap(),
        "\"video\""
    );
}

#[test]
fn serializes_media_statuses_as_lowercase() {
    assert_eq!(
        serde_json::to_string(&PostMediaStatus::Ready).unwrap(),
        "\"ready\""
    );
}

#[test]
fn rejects_unknown_media_values() {
    assert!(serde_json::from_str::<PostMediaKind>("\"audio\"").is_err());
    assert!(serde_json::from_str::<PostMediaStatus>("\"uploaded\"").is_err());
    assert!(serde_json::from_str::<PostMediaStatus>("\"deleted\"").is_err());
}
