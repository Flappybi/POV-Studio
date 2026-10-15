# POV Studio — Advertising From Your POV

POV Studio turns a customer story and an approved Brand Kit into a personalized, three-scene motion ad. AMD powers the creative plan and instrumental music direction; the browser renders the uploaded assets and synthesizes the soundtrack.

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
2. Optionally upload a logo, product photo and background. PNG, JPEG and WebP are supported, up to 650 KB each. Without a background, the renderer uses brand colors.
3. Save the Brand Kit. Enter a real customer story and choose time of day, energy and a 10/15/20-second duration.
4. Create an ad. AMD returns English creative copy, three scenes, music style/BPM and an exact story quotation used as evidence. User-supplied brand names, CTA and facts remain verbatim.
5. In **Choose your soundtrack**, audition the three instrumental recommendations with a six-second preview, then select **Use track**. The selected track is used by both ad playback and WebM export. You can also seek, mute, rate relevance, and download PNG or the plan/metrics JSON.
6. Results are stored locally in this browser, up to 12 ads. Export before clearing browser data.

**Clear Brand Kit** immediately clears the active brand and uploaded assets, including browser storage. It does not delete saved ads. Reopening a saved ad restores that ad's original brand for viewing.

## What AMD and the browser each do

- **AMD:** language-model inference for the creative story, scene text, explanation and instrumental direction.
- **Browser:** a deterministic multi-shot edit, curated zoom/slide/perspective-turn transitions, text fitting, projected product animation, offline instrumental synthesis and video recording.
- **Server:** input validation, response checks, retry after an invalid plan, usage aggregation and optional cost calculation.

Music uses procedural instrumental arrangements with melody, chords, bass and percussion. Three takes follow the existing AMD music direction: layered keys, a plucked groove, and a spacious atmosphere. Each has a different score, timbre and tempo. The chosen take is saved with the ad and included in JSON exports; opening the ad again restores the choice. Auditions stop after six seconds, and switching tracks or starting video playback stops the previous audition. Music is not a downloaded commercial song or an audio model's generated recording. Older saved ads without music direction use the energy preference. A muted player exports without music; the picker explains this state.

## Quality and practical limits

New creative plans must quote a meaningful exact substring of the original story. The server checks the unchanged brand name, CTA and approved facts, scene count, field limits, music selection and unsupported numeric claims. Invalid plans get one repair attempt; failures are shown instead of replaced with fake demo content.

These checks reduce mistakes but do not prove that every sentence is factually correct or relevant. Review the ad before publishing. A relevance rating is subjective feedback, not measured conversion uplift.

The video animates uploaded assets rather than generating footage. The three story acts contain multiple short shots: normally 6 for 10 seconds, 9 for 15 seconds, and 12 for 20 seconds; Bold can add more cuts. Each energy preference selects two complementary transition types. Product photos are projected as textured planes with X/Y/Z rotation and camera depth, with parallax backgrounds and a depth stage. This is 2.5D animation of the supplied image, not a volumetric model or a synthesized view of the product's hidden sides. Visual render/export runs in the browser, not on AMD GPUs. Browser storage is local, not a shared database. Use Chrome or Edge for WebM export.

Browsers without OffscreenCanvas use a single affine plane as a compatibility fallback, retaining depth-scaled movement and tilt while avoiding transparency seams.

## Production build

```sh
npm test
npm run build
npm start
```

The server serves `dist/` in production.

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
