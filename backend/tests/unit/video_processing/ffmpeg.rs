use std::path::Path;

use super::*;

#[test]
fn encoding_caps_width_without_upscaling() {
    let arguments = encode_arguments(Path::new("input.webm"), Path::new("output.mp4"));
    let arguments = arguments
        .iter()
        .map(|value| value.to_string_lossy())
        .collect::<Vec<_>>();

    assert!(arguments.contains(&"scale=w='max(2,trunc(min(2560,iw)/2)*2)':h=-2".into()));
    assert!(arguments.contains(&"libx264".into()));
    assert!(arguments.contains(&"+faststart".into()));
}

#[test]
fn poster_uses_ten_percent_capped_at_one_second() {
    let short = poster_arguments(Path::new("video.mp4"), Path::new("poster.jpg"), 5_000);
    let long = poster_arguments(Path::new("video.mp4"), Path::new("poster.jpg"), 60_000);

    assert!(short.contains(&"0.500".into()));
    assert!(long.contains(&"1.000".into()));
}

#[test]
fn validates_probed_video_metadata() {
    let valid = ProbeOutput {
        streams: vec![ProbeStream {
            codec_type: Some("video".into()),
            width: Some(1920),
            height: Some(1080),
        }],
        format: ProbeFormat {
            duration: Some("2.345".into()),
        },
    };
    let missing_video = ProbeOutput {
        streams: vec![],
        format: ProbeFormat {
            duration: Some("2.345".into()),
        },
    };

    assert_eq!(
        metadata_from_probe(valid).unwrap(),
        VideoMetadata {
            width: 1920,
            height: 1080,
            duration_ms: 2345,
        }
    );
    assert!(metadata_from_probe(missing_video).is_err());
}
