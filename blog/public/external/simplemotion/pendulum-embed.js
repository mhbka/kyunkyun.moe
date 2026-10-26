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
  try {
    const imageUrls = await loadImageUrls(player.iconLabels(), assets);
    const renderer = new SvgAnimationRenderer(svg, {
      width: player.screenWidth,
      height: player.screenHeight,
      leftExtension: LEFT_EXTENSION,
      rightExtension: RIGHT_EXTENSION,
    });
    let clicked = false;
    let previousTime = performance.now();
    let frame = 0;
    let disposed = false;
    const desktop = window.matchMedia('(min-width: 801px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const controller = new AbortController();

    await renderer.setInteractiveImage({
      icon: "src/SD002/七海体",
      imageUrl: imageUrls.get("src/SD002/七海体"),
      onClick: () => {
        clicked = true;
      },
    });

    // Draws a first frame before reporting readiness, including for reduced motion.
    player.advance(0, false);
    renderer.render(player.commands(0), imageUrls);
    desktop.addEventListener('change', updateAnimation, { signal: controller.signal });
    reducedMotion.addEventListener('change', updateAnimation, { signal: controller.signal });
    document.addEventListener('visibilitychange', updateAnimation, { signal: controller.signal });
    updateAnimation();

    // Stops detached players and releases their WebAssembly allocation.
    function dispose() {
      if (disposed) return;
      disposed = true;
      cancelAnimationFrame(frame);
      controller.abort();
      player.free();
    }

    // Pauses hidden and reduced-motion animation without removing its first frame.
    function updateAnimation() {
      cancelAnimationFrame(frame);
      if (disposed) return;
      if (!svg.isConnected) { dispose(); return; }
      if (!desktop.matches || reducedMotion.matches || document.hidden) return;
      previousTime = performance.now();
      frame = requestAnimationFrame(render);
    }

    /// Advances the pendulum and renders its current SVG state.
    function render(now) {
      if (!svg.isConnected) { dispose(); return; }
      const delta = Math.min((now - previousTime) / 1000, MAX_DELTA_SECONDS);
      previousTime = now;

      player.advance(delta, clicked);
      clicked = false;
      renderer.render(player.commands(Math.max(0, Math.floor(now / (1000 / 60)))), imageUrls);
      frame = requestAnimationFrame(render);
    }

    return dispose;
  } catch (error) {
    // Releases the WebAssembly allocation so a failed mount can be retried.
    player.free();
    throw error;
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
