# KiriKiri MotionPlayer support

This folder contains a browser-oriented subset of the MotionPlayer PSB format
exported as JSON. It is deliberately separate from the generic canvas renderer
so it can become a standalone library later.

## Scope

- [x] Identify the format as MotionPlayer PSB JSON (`spec: "krkr"`).
- [x] Record the source-image and motion/timeline structure used by `sd002`.
- [x] Parse and validate the document into UTF-8-safe TypeScript structures.
- [x] Report renderer features that the selected document needs but we do not
  support yet.
- [ ] Compile source layers, layout layers, and nested motion references into
  the generic canvas scene format.
- [ ] Preserve masked frame state, origins, clip offsets, timing, and cubic
  interpolation.
- [ ] Migrate Nanami from the handwritten scene to `sd002.json`.
- [ ] Add parser/compiler tests for malformed data, held frame values, nested
  motions, offsets, and easing.

## First supported renderer subset

The first usable compiler supports 2D source/layout layers, nested motions,
position, rotation, scale, opacity, visibility, source origins, clip offsets,
loop timing, and draw ordering. The compiler must report meshes, stencils,
blend/color transforms, 3D coordinate modes, and parameterized behaviour until
we implement them deliberately.

## References

The game's original MotionPlayer implementation is not publicly documented.
Behaviour is based on the extracted `sd002.json` and the reverse-engineered
KrKr2 MotionPlayer implementation:

- https://github.com/2468785842/krkr2
- https://github.com/2468785842/krkr2/blob/main/cpp/plugins/motionplayer/PlayerUpdateGeometry.cpp
- https://github.com/2468785842/krkr2/blob/main/cpp/plugins/motionplayer/PlayerUpdateLayerEval.cpp
