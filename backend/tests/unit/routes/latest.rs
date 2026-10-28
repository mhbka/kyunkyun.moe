use chrono::{TimeZone, Utc};

use crate::models::latest::Latest;

#[test]
fn serializes_the_home_snapshot_contract() {
    let latest = Latest {
        pix: vec![],
        post: None,
        tweet: None,
        generated_at: Utc.with_ymd_and_hms(2026, 10, 28, 0, 0, 0).unwrap(),
    };

    assert_eq!(
        serde_json::to_value(latest).unwrap(),
        serde_json::json!({
            "pix": [],
            "post": null,
            "tweet": null,
            "generatedAt": "2026-10-28T00:00:00Z"
        })
    );
}
