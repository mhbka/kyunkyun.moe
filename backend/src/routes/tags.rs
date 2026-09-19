use axum::{extract::State, routing::get, Json, Router};

use crate::{models::tags::TagSummary, routes::error::RouteResult, state::AppState};

/// Builds the public tag-listing API route.
pub fn router() -> Router<AppState> {
    Router::new().route("/", get(list_tags))
}

/// GET /tags — tags and their public post counts, most used first.
async fn list_tags(State(app_state): State<AppState>) -> RouteResult<Json<Vec<TagSummary>>> {
    let tags = sqlx::query_as::<_, TagSummary>(
        r#"
        select tag, count(*)::bigint as count
        from posts cross join lateral unnest(tags) as tag
        where status = 'published' and published_at <= now() and deleted_at is null
        group by tag
        order by count desc, tag asc
        "#,
    )
    .fetch_all(&app_state.pool)
    .await?;

    Ok(Json(tags))
}

/// Combines legacy single-tag filters and JSON tag arrays with AND semantics.
pub(super) fn parse_filters(
    tag: Option<&str>,
    tags: Option<&str>,
) -> Result<Vec<String>, super::error::RouteError> {
    let mut values: Vec<String> = match tags {
        Some(value) => serde_json::from_str(value).map_err(|_| {
            super::error::RouteError::bad_request("tags must be a JSON array of strings")
        })?,
        None => Vec::new(),
    };
    values.extend(tag.map(str::to_owned));
    let mut normalized = Vec::new();
    for value in values {
        let value: String = value.to_lowercase().split_whitespace().collect();
        if !value.is_empty() && !normalized.contains(&value) {
            normalized.push(value);
        }
    }
    Ok(normalized)
}

#[cfg(test)]
mod filter_tests {
    use super::parse_filters;

    #[test]
    fn keeps_all_required_tags_and_normalizes_duplicates() {
        assert_eq!(
            parse_filters(Some("Astro"), Some(r#"["Java Script", "astro", " "]"#)).unwrap(),
            vec!["javascript", "astro"]
        );
        assert!(parse_filters(None, None).unwrap().is_empty());
        assert_eq!(parse_filters(Some("Astro"), None).unwrap(), vec!["astro"]);
    }

    #[test]
    fn rejects_invalid_tag_arrays() {
        for value in ["invalid", "null", "[1]", "{}"] {
            assert!(parse_filters(None, Some(value)).is_err());
        }
    }
}
