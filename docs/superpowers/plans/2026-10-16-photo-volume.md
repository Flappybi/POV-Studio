> Retired: the user requested removal of 3D and a return to 2D photo animation. This file records the earlier implementation only.

# Photo-derived 3D product implementation

> Execute inline using superpowers:executing-plans; request independent review after native QA.

**Goal:** Replace the flat product plane with an actual closed, shaded 3D approximation derived from the uploaded photograph, as explicitly selected by the user.

**Architecture:** A pure module extracts the visible silhouette and builds front/back surfaces plus side walls with nonzero thickness. A dynamically loaded Three.js controller renders this volume with a real perspective camera, lighting and shadows; the existing canvas renderer composites that layer with ad copy, music credits and the user's background. Front appearance uses the photograph. Side and back geometry/material are estimates, never fabricated photographic views.

**Files:** `photo-volume.mjs` owns mask/mesh construction; `product3d.mjs` owns GPU rendering/disposal and GLB export; `renderer.mjs` prepares assets; `motion.mjs` composites a full-orbit volume; `AdPreview.jsx` shows approximation status and allows downloading the real model.

**Constraints:** No new external AI service or credentials. Keep the app initially blank. Process uploaded images locally. Plain-background/transparent product cutouts are required; report extraction or WebGL errors explicitly. Preserve approved facts, story/preferences, licensed soundtrack selection and export. Release GPU resources on ad changes/unmount. Do not alter `.env` or unrelated existing changes.

- [x] Add and observe failing tests for silhouette extraction, actual volume, closed topology, holes and degenerate input.
- [x] Implement mesh construction and true 3D scene; validate front/side/back views natively.
- [x] Integrate preview, video and downloadable GLB, with honest approximation labeling and resource cleanup.
- [x] Verify full tests/build, real video/model exports, input/preferences regressions, mobile and independent review. Sync active project and mirror.

Verification: 59 Node tests passed; production build passed; native Edge front/side/back, GLB roundtrip, actual UI GLB/PNG/WebM export, input/music regression and mobile checks passed. Independent review identified an opaque-aperture ambiguity, fixed with explicit transparent-PNG guidance and a red/green regression. Deliverable mirror synchronized; no credentials copied.
