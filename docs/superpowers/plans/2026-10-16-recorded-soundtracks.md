# Recorded soundtracks and rhythmic editing

> Execute inline using superpowers:executing-plans, then request one independent review.

**Goal:** Replace synthetic music with bundled licensed instrumental recordings and make the existing asset-based video edit more expressive and rhythmically coordinated.

**Architecture:** Keep the AMD creative-plan contract and saved soundtrack IDs. Rank a local recording catalog from AMD's music style; playback and export consume the same decoded and faded buffer. Use recording BPM to build a variable-length visual timeline with three readable story acts. Include attribution in video and downloadable credits.

**Tech stack:** React, Canvas 2D/perspective mesh, Web Audio, MediaRecorder, Node tests, native Edge QA.

- [x] Add failing catalog, attribution, bundled-file and beat-timeline tests; observe failures.
- [x] Prepare five CC BY 4.0 excerpts, record official provenance and changes; replace synth playback, update picker and credits.
- [x] Build beat-aware edit timing, varied camera compositions, transition accents and final resolve while protecting copy and transparency.
- [x] Run all tests/build; inspect native audio, image frames and real exported video; request independent review and address findings.
- [x] Sync verified source/assets/dist to the deliverable folder.

Ruling: Upgrade the existing renderer in the user's active project; preserve unrelated deletion of tests/test.py and all credentials. Actual recording tempo may be outside AMD's requested 72Ã¢â‚¬â€œ132 range; do not time-stretch recordings or mislabel their tempo.

Verification: 40 Node tests pass; production build passes. Native Edge checks confirm three distinct decoded recordings, audition cancellation, persisted selection, seeking, mute behavior, mobile layout and export waveform correlation 1.0 with the chosen recording. The actual exported 1280x720 WebM decodes with audio and video. 324 maximum-copy/asset-shape renders and perspective alpha checks pass. Independent reviewer found no important issues; stale synthesis documentation was corrected.
Additional verification: an unavailable recording reports an actionable error; retry after restoring the asset succeeds. Native export contains stereo 48 kHz Opus audio.
