use std::{ffi::OsString, path::Path, process::Stdio};

use anyhow::{anyhow, Context};
use serde::Deserialize;
use tokio::process::Command;

const MAX_VIDEO_WIDTH: i32 = 2560;

/// Describes the generated video file used to update display metadata.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct VideoMetadata {
    pub width: i32,
    pub height: i32,
    pub duration_ms: i64,
}

/// Contains the small portion of FFprobe output needed by the worker.
#[derive(Debug, Deserialize)]
struct ProbeOutput {
    streams: Vec<ProbeStream>,
    format: ProbeFormat,
}

/// Contains dimensions for one probed stream.
#[derive(Debug, Deserialize)]
struct ProbeStream {
    codec_type: Option<String>,
    width: Option<i32>,
    height: Option<i32>,
}

/// Contains the container duration reported as decimal seconds.
#[derive(Debug, Deserialize)]
struct ProbeFormat {
    duration: Option<String>,
}

/// Encodes one video, generates its poster, and returns output metadata.
pub async fn process(
    input_path: &Path,
    output_path: &Path,
    poster_path: &Path,
) -> anyhow::Result<VideoMetadata> {
    run("ffmpeg", encode_arguments(input_path, output_path)).await?;
    let metadata = probe(output_path).await?;
    run(
        "ffmpeg",
        poster_arguments(output_path, poster_path, metadata.duration_ms),
    )
    .await?;
    Ok(metadata)
}

/// Reads dimensions and duration from a processed video.
async fn probe(path: &Path) -> anyhow::Result<VideoMetadata> {
    let output = Command::new("ffprobe")
        .args(probe_arguments(path))
        .stdin(Stdio::null())
        .output()
        .await
        .context("failed to start ffprobe")?;
    if !output.status.success() {
        return Err(command_error("ffprobe", &output.stderr));
    }

    let probe: ProbeOutput =
        serde_json::from_slice(&output.stdout).context("ffprobe returned invalid JSON")?;
    metadata_from_probe(probe)
}

/// Runs a media command without involving a shell.
async fn run(program: &str, arguments: Vec<OsString>) -> anyhow::Result<()> {
    let output = Command::new(program)
        .args(arguments)
        .stdin(Stdio::null())
        .output()
        .await
        .with_context(|| format!("failed to start {program}"))?;
    if output.status.success() {
        Ok(())
    } else {
        Err(command_error(program, &output.stderr))
    }
}

/// Builds a concise command error without storing unbounded FFmpeg output.
fn command_error(program: &str, stderr: &[u8]) -> anyhow::Error {
    let stderr = String::from_utf8_lossy(stderr);
    let tail = stderr
        .chars()
        .rev()
        .take(4_000)
        .collect::<String>()
        .chars()
        .rev()
        .collect::<String>();
    anyhow!("{program} failed: {tail}")
}

/// Builds stable web-video encoding arguments.
fn encode_arguments(input_path: &Path, output_path: &Path) -> Vec<OsString> {
    let scale = format!("scale=w='max(2,trunc(min({MAX_VIDEO_WIDTH},iw)/2)*2)':h=-2");
    strings(["-hide_banner", "-loglevel", "error", "-y", "-i"])
        .into_iter()
        .chain([input_path.as_os_str().to_owned()])
        .chain(strings([
            "-vf",
            &scale,
            "-c:v",
            "libx264",
            "-preset",
            "medium",
            "-crf",
            "28",
            "-pix_fmt",
            "yuv420p",
            "-c:a",
            "aac",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
        ]))
        .chain([output_path.as_os_str().to_owned()])
        .collect()
}

/// Builds poster extraction arguments using an early representative frame.
fn poster_arguments(video_path: &Path, poster_path: &Path, duration_ms: i64) -> Vec<OsString> {
    let timestamp_ms = (duration_ms / 10).clamp(0, 1_000);
    let timestamp = format!("{:.3}", timestamp_ms as f64 / 1_000.0);
    strings([
        "-hide_banner",
        "-loglevel",
        "error",
        "-y",
        "-ss",
        &timestamp,
        "-i",
    ])
    .into_iter()
    .chain([video_path.as_os_str().to_owned()])
    .chain(strings(["-frames:v", "1", "-q:v", "3"]))
    .chain([poster_path.as_os_str().to_owned()])
    .collect()
}

/// Builds the FFprobe arguments used for generated files.
fn probe_arguments(path: &Path) -> Vec<OsString> {
    strings([
        "-v",
        "error",
        "-show_entries",
        "stream=codec_type,width,height:format=duration",
        "-of",
        "json",
    ])
    .into_iter()
    .chain([path.as_os_str().to_owned()])
    .collect()
}

/// Converts validated FFprobe output into database metadata.
fn metadata_from_probe(probe: ProbeOutput) -> anyhow::Result<VideoMetadata> {
    let stream = probe
        .streams
        .iter()
        .find(|stream| stream.codec_type.as_deref() == Some("video"))
        .ok_or_else(|| anyhow!("processed file has no video stream"))?;
    let width = stream.width.filter(|value| *value > 0);
    let height = stream.height.filter(|value| *value > 0);
    let duration_ms = probe
        .format
        .duration
        .as_deref()
        .and_then(|value| value.parse::<f64>().ok())
        .filter(|value| value.is_finite() && *value >= 0.0)
        .map(|value| (value * 1_000.0).round() as i64);

    match (width, height, duration_ms) {
        (Some(width), Some(height), Some(duration_ms)) => Ok(VideoMetadata {
            width,
            height,
            duration_ms,
        }),
        _ => Err(anyhow!("processed video metadata is incomplete")),
    }
}

/// Converts string slices into command arguments.
fn strings<const N: usize>(values: [&str; N]) -> Vec<OsString> {
    values.into_iter().map(OsString::from).collect()
}

#[cfg(test)]
#[path = "../../tests/unit/video_processing/ffmpeg.rs"]
mod tests;
