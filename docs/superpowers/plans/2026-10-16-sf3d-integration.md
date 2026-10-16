> Retired: the user requested removal of 3D and a return to 2D photo animation. This file records the earlier implementation only.

# SF3D GLB integration

User approved installing the tested SF3D output and requested the additional workflow remain free. Implementation retains an empty initial app and generic product support.

- [x] Validate self-contained GLBs and lightweight references; exclude model metadata from the AMD prompt/request.
- [x] Store uploaded binaries in IndexedDB, expose upload/front-angle/photo-only controls in Brand Kit.
- [x] Bind the installed SF3D asset only to its exact source-photo hash. Never reuse it for other photos.
- [x] Replace automatic silhouette extrusion with real GLB loading/rendering, normalized transforms, materials, lighting and disposal.
- [x] Verify automatic model preview, actual PNG/GLB/WebM exports, custom upload/reload/history, corrupt and missing model handling, photo change invalidation and mobile layout in native Edge. Independent reviewer verified the corrected SF3D/uploaded/photo labels and reported no remaining important findings.
- [x] Final tests/build and source/build sync to deliverable mirror.

Public SF3D generation remains an external manual step. No paid API request or new credential is introduced. Remaining output limits include approximate backs, changed colors and small-logo fidelity.
