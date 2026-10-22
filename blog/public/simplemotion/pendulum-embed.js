import init, { PendulumDemo } from "./simplemotion_web.js";
import { SvgAnimationRenderer } from "./svg-renderer.js";

const LEFT_EXTENSION = 400;
const RIGHT_EXTENSION = 150;
const MAX_DELTA_SECONDS = 0.05;

let wasmReady;

/// Mounts the interactive SD002 pendulum onto an SVG element.
export async function mountPendulum(svg, assets) {
  wasmReady ??= init();
  await wasmReady;

  const json = await (await fetch(assets.jsonUrl)).text();
  const player = new PendulumDemo(json);
  const imageUrls = await loadImageUrls(player.iconLabels(), assets);
  const renderer = new SvgAnimationRenderer(svg, {
    width: player.screenWidth,
    height: player.screenHeight,
    leftExtension: LEFT_EXTENSION,
    rightExtension: RIGHT_EXTENSION,
  });
  let clicked = false;
  let previousTime = performance.now();

  await renderer.setInteractiveImage({
    icon: "src/SD002/七海体",
    imageUrl: imageUrls.get("src/SD002/七海体"),
    onClick: () => {
      clicked = true;
    },
  });

  requestAnimationFrame(render);

  /// Advances the pendulum and renders its current SVG state.
  function render(now) {
    const delta = Math.min((now - previousTime) / 1000, MAX_DELTA_SECONDS);
    previousTime = now;

    player.advance(delta, clicked);
    clicked = false;
    renderer.render(player.commands(Math.max(0, Math.floor(now / (1000 / 60)))), imageUrls);
    requestAnimationFrame(render);
  }
}

/// Locates every icon image required by the pendulum animation.
async function loadImageUrls(labels, assets) {
  const directoryUrl = new URL(assets.imageDirectoryUrl, window.location.href);
  const entries = labels.map((label) => {
    const name = label.split("/").at(-1);
    return [label, new URL(`${assets.imagePrefix}-${name}.png`, directoryUrl).href];
  });
  await Promise.all(entries.map(([, imageUrl]) => decodeImage(imageUrl)));
  return new Map(entries);
}

/// Downloads and decodes an SVG source image before animation begins.
async function decodeImage(imageUrl) {
  const image = new Image();
  image.src = imageUrl;
  await image.decode();
}
