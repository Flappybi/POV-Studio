# POV Studio — Advertising From Your POV

POV Studio turns a customer story and an approved Brand Kit into a personalized, three-scene motion ad. AMD powers the creative plan and instrumental music direction; the browser renders the uploaded assets and plays a selected licensed instrumental recording.

The app starts empty. No demo brand, product images, preset stories or local fake AI responses are loaded.

## Run locally

Requires Node.js 22.12 or newer.

```sh
npm ci
```

Copy `.env.example` to `.env` and set the exact endpoint, key and model supplied by your AMD account. Keep `.env` private.

```sh
npm run dev
```

Open http://127.0.0.1:5173. The local API runs on port 4173.

## Configuration

| Variable | Purpose |
| --- | --- |
| AMD_BASE_URL | OpenAI-compatible AMD base URL, without `/chat/completions` |
| AMD_API_KEY | Server-only API key |
| AMD_MODEL | Exact model ID from AMD |
| AMD_TIMEOUT_MS | Optional timeout per attempt, 10–180 seconds; default 120 seconds |
| AMD_INPUT_PRICE_PER_MILLION | Optional verified input price in USD |
| AMD_OUTPUT_PRICE_PER_MILLION | Optional verified output price in USD |
| PORT | API/production app port, default 4173 |
| HOST | Listen address, default 127.0.0.1 locally |
| APP_ORIGIN | Exact public origin, such as https://your-app.example, when deployed |

Unknown token prices remain unavailable; the app does not invent cost figures. Rate limits and quotas belong to the AMD account. No API key is sent to the browser.

## Workflow

1. Open **Brand Kit**. Enter the brand, product, category, price, tagline, CTA, approved facts and colors.
2. Optionally upload a logo, product photo and background (PNG, JPEG or WebP, up to 650 KB each). The browser animates the original product photograph in 2D.
3. Save the Brand Kit. Enter a real customer story and choose time of day, energy and a 10/15/20-second duration.
4. Create an ad. AMD returns English creative copy, three scenes, music style/BPM and an exact story quotation used as evidence. User-supplied brand names, CTA and facts remain verbatim.
5. In **Choose your soundtrack**, audition the three instrumental recommendations with a six-second preview, then select **Use track**. The selected track is used by both ad playback and WebM export. You can also seek, mute, rate relevance, and download PNG or the plan/metrics JSON.
6. Results are stored locally in this browser, up to 12 ads. Export before clearing browser data.

**Clear Brand Kit** immediately clears the active brand and uploaded assets, including browser storage. It does not delete saved ads. Reopening a saved ad restores that ad's original brand for viewing.

## What AMD and the browser each do

- **AMD:** language-model inference for the creative story, scene text, explanation and instrumental direction.
- **Browser:** 2D animation of uploaded photos, text fitting, transitions, licensed recording playback, beat-aware shot timing and video recording.
- **Server:** input validation, response checks, retry after an invalid plan, usage aggregation and optional cost calculation.

Music uses five bundled instrumental recordings by **Kevin MacLeod**, licensed under **CC BY 4.0**. AMD can recommend three actual recording IDs from the supplied catalog. The app ranks compatible recordings using that direction, the requested Energy and Time of day; users audition and choose the actual song. Calm excludes the driving Cipher recording, Bold prioritizes the energetic part of the catalog, and Energetic excludes Dream Culture. Similar stories can still share recommendations because the bundled library contains five recordings. The recording keeps its original tempo and timbre; AMD does not generate the recording. Clips are stereo 48 kHz / 192 kbps MP3 excerpts, prepared with loudness normalization, then faded to the ad duration. Preview and WebM export use the same decoded recording. Export requests 192 kbps audio; actual encoder output depends on the browser. Failed audio loading is reported, without a synthesized substitute.

The exact three recording keys and selected slot are saved with new ads. Legacy saved ads retain their previous three-song order; opening an older saved ad restores that slot using the new recording catalog. Auditions stop after six seconds, and switching tracks or starting video playback stops the previous audition. Older ads without music direction use the energy preference. Muted exports contain no music or music attribution. Music-enabled videos carry attribution in the footer; keep it when sharing. The picker also offers a downloadable credit, and Studio's JSON includes the actual selected recording metadata and credit. Full provenance, excerpt offsets and modifications are in [public/music/CREDITS.txt](public/music/CREDITS.txt) and [public/music/provenance.json](public/music/provenance.json). License: [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).


## Quality and practical limits

New creative plans must quote a meaningful exact substring of the original story. The server supplies approved brand name, CTA and product facts if AMD omits those constants, and rejects explicit changes. It checks scene count, field limits, music selection and unsupported numeric claims. Invalid plans get one repair attempt; failures are shown instead of replaced with fake demo content.

These checks reduce mistakes but do not prove that every sentence is factually correct or relevant. Review the ad before publishing. A relevance rating is subjective feedback, not measured conversion uplift.

The video animates uploaded assets rather than generating footage. The three story acts contain variable-length shots placed on a half-beat grid at the selected recording's published tempo. The sequence draws from six camera moves: a right orbit, a high-angle reveal, a left orbit, a low-angle lift, a detail track and a settled hero shot. Calm allows longer moves; Bold retains a faster rhythm. The final shot lasts at least 1.8 seconds and settles to a still closing pose. Shot count depends on duration, mood and actual recording BPM. Camera paths use easing with zero velocity and acceleration at their endpoints, with no spring rebound or periodic wobble. The scissor window follows the product across the frame, and incoming copy waits for the camera move to clear its space. Morning, Afternoon and Evening change environmental lighting and background exposure while preserving uploaded product colors and brand panels. Energy changes camera amplitude as well as rhythm. All three scene texts are used: opening and closing scene copy appears in the video; copy already present in the headline or CTA is not duplicated as a caption. The product stays a photograph. Animation changes its position, scale and tilt together with the ad layout, background and text. It does not reconstruct hidden product surfaces or generate new footage. Preview and video export use the same 2D canvas renderer.

Older saved ads retain their photographs, copy and soundtrack. Retired model selections are ignored, and the old model-only database is removed on startup. Brand Kit, image assets and saved ads are kept separately. The app starts empty and supports typography-only ads without a product photo. Use Chrome or Edge for WebM export and keep the tab active while recording; actual frame rate depends on the device.

## Production build

```sh
npm test
npm run build
npm start
```

The server serves `dist/` in production.

## Netlify deployment

Deploy the repository with the root `netlify.toml`, not by uploading `dist` alone. Netlify builds the Vite frontend and bundles `netlify/functions/api.mjs`. Its custom `/api/*` route handles both `/api/status` and `/api/generate` using the existing AMD provider and plan validation. Local development continues to use Express.

In Netlify's **Project configuration > Environment variables**, set `AMD_BASE_URL`, `AMD_API_KEY` and `AMD_MODEL` for the **Functions** scope and the deploy context you are publishing. Keep only the API key marked as a secret. The endpoint and model are public configuration, not credentials. Do not create `VITE_AMD_API_KEY` or commit `.env`. `PORT` is only needed locally and should be omitted from Netlify. Prices are optional and may be left unset. `APP_ORIGIN` is optional for an additional exact public origin. Requests from the deployed site's own origin are accepted automatically, including deploy previews.

Push the new configuration and function files to the connected repository, then deploy that commit. After deployment, open `/api/status`. It should return JSON with `configured: true` before testing ad creation. A 404 means the function or root configuration is missing from the published commit. A 503 means required runtime environment variables are missing. A 502 reports an AMD request or plan error rather than a missing route.

Netlify synchronous functions have a 60-second execution limit. This adapter caps each AMD attempt at 25 seconds, including up to one plan repair, and advertises a shorter browser timeout through `/api/status`. Longer AMD timeouts remain available when running the Express server on a host that supports them. The two-request concurrency guard applies per function instance, not globally across Netlify. Normal AMD account quotas still apply.

References: [Netlify Functions](https://docs.netlify.com/build/functions/overview/), [function execution limits](https://docs.netlify.com/build/functions/configuration/), [runtime environment variables](https://docs.netlify.com/build/functions/environment-variables/).

## Container packaging

A Dockerfile is provided. `.env` and local build files are excluded from the build context; credentials must be supplied at runtime.

```sh
docker build -t pov-studio .
docker run --rm -p 4173:4173 --env-file .env -e HOST=0.0.0.0 -e APP_ORIGIN=http://localhost:4173 pov-studio
```

For a public host, set APP_ORIGIN to its exact HTTPS origin. Container packaging has not been verified where Docker is unavailable. No deployment or repository publication is performed automatically.

## Competition evidence

Demonstrate at least two real customer stories using the same brand, showing how the message and music change while brand assets and approved facts stay consistent. Explain the AMD inference path, browser rendering, actual response time/token usage, and cost only when verified. Include real user feedback with sample size; do not claim improved sales without evidence.

Before submitting, publish the authorized repository and working app, check event eligibility and license requirements, and prepare the pitch/demo video. These are submission tasks, not automatic actions of this app.

Changing **Your story** or **Ad preferences** creates an unapplied draft. The app marks the visible ad as the previous version and offers **Create updated ad**. A new AMD request applies the story and preferences; typing does not silently regenerate or overwrite saved ads. Applied time, energy and duration are displayed above the player.

