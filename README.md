# Sewing Shop Review Generator

A lightweight React + TypeScript + Vite frontend and Cloudflare Worker API for drafting editable reviews. English, conversational Romanized Gujarati, and conversational Romanized Hindi are supported. The customer always edits and submits any review manually.

## What's included

- Responsive, accessible UI with eight centrally defined review topics. The displayed “Stitch & Sew” brand is a placeholder; replace it with the shop name in `src/main.tsx`.
- `POST /api/reviews/generate` validates language/topic IDs and creates a server-side Gemini prompt.
- 240 static fallback sentences: 8 categories × 10 variations × 3 languages. Fallbacks require no AI call.
- Script validation rejects Gujarati and Devanagari characters in transliterated output; invalid AI output falls back rather than making repeated requests.
- Browser-local four-attempt daily counter, plus best-effort isolate-local IP throttling.
- No database, customer account, server-side review retention, or automatic Google posting.

## Local setup

Requirements: Node.js 20+ and npm.

```sh
npm install
cp .env.example .env.local
# Edit .env.local and set VITE_GOOGLE_REVIEW_URL to the shop's actual Google review URL.
cp worker/.dev.vars.example worker/.dev.vars
# Edit worker/.dev.vars with your own Gemini API key. Never commit this file.
npm run build
npm test
```

Start the frontend with `npm run dev`. The Vite dev server proxies `/api` to `http://127.0.0.1:8787`; start the API locally with `npx wrangler dev --config wrangler.toml --port 8787`. For production, the included `functions/api/reviews/generate.ts` Pages Function routes the API on the same origin.

### Environment variables

| Variable | Where | Purpose |
|---|---|---|
| `VITE_GOOGLE_REVIEW_URL` | Frontend build | Actual shop review URL. Public, not a secret. Empty means the Google button is disabled. |
| `GEMINI_API_KEY` | Worker secret | Gemini API key. Never prefix with `VITE_`. |
| `GEMINI_MODEL` | Worker variable | Model identifier, defaults in code/config to `gemini-2.5-flash-lite`. Check current free-tier availability before changing it. |
| `ALLOWED_ORIGIN` | Worker variable (optional) | Exact origin permitted for cross-origin browser requests. Same-origin requests are preferred. |

## Free-tier and model notes

The model name is configurable. Gemini model availability and free-tier request/token limits change by model, account, region, and date; verify current eligibility in Google AI Studio / the official Gemini API pricing and rate-limit documentation before deployment. This project never switches to a paid model automatically. If Gemini is unavailable, the Worker returns a static fallback without making another AI request. A successful API response has `{ "review": "...", "source": "ai" }`; fallback responses use `source: "fallback"`.

## Deploying on Cloudflare free tier

1. Create a Cloudflare account and a Pages project connected to this repository (or upload the built static assets). Use the **Free** plan; do not upgrade or enable paid services.
2. In Pages build settings, set build command `npm run build` and output directory `dist`. Set `VITE_GOOGLE_REVIEW_URL` to the shop's actual review URL before building.
3. The included `functions/api/reviews/generate.ts` is the same-origin Pages Function entry point for `/api/reviews/generate`. Keep the `functions/` directory at the repository root so Pages discovers it.
4. In Pages project settings, add `GEMINI_API_KEY` as an encrypted environment variable/secret for both Preview and Production as appropriate. Add `GEMINI_MODEL=gemini-2.5-flash-lite` as a plain variable. Never use a `VITE_` prefix for the key. You may also set `ALLOWED_ORIGIN` to the exact deployed origin if needed; same-origin requests work without it. Do not paste secrets into source files.
5. In the Cloudflare dashboard, confirm the project is on the Free plan and review current included quotas before public launch. Do not enable paid add-ons or billing upgrades. Wrangler standalone deployment is optional for deployments that do not use Pages Functions; if you choose it, run `npx wrangler login`, `npx wrangler secret put GEMINI_API_KEY`, then `npx wrangler deploy` from the repository root.
6. Test: unsupported method returns 405; invalid JSON/language/category returns 400; too-large payload returns 413; AI success returns `source: ai`; missing/invalid key, quota exhaustion, timeout, or malformed/script-invalid AI response returns `source: fallback`. Confirm no key appears in browser bundles or logs.

Cloudflare Pages and Workers routing layouts vary by deployment setup; a Pages Function adapter may be needed to make the API same-origin. Do not simply deploy the static frontend without the Worker route and expect the API endpoint to work.

## Usage limits and abuse controls

- Frontend permits four API attempts per local calendar day, including failed requests, using local storage. Users can clear or bypass it, so it is a convenience limit, not verified identity enforcement.
- Worker memory maintains a best-effort eight-requests-per-minute IP throttle. Isolate restarts, eviction, multiple isolates, and shared IPs mean it is not a strict global rate limit. No paid database or rate-limiting service is used.
- The 2 KiB body cap, 8-second Gemini timeout, 180-token output limit, request schema validation, and no retry on provider failures reduce waste.
- Fallback composition uses static data and does not call Gemini.

## Privacy and integrity

The API does not persist drafts or customer identities. Operational logs contain request outcome, duration, language, category count, and an error category only; they do not include prompts, API keys, or review text. The Worker does process the chosen categories and sends them to Gemini for generation. The customer should edit the draft and verify it truthfully reflects their own experience. The app never posts a review or signs in to Google on the customer's behalf.

## Maintainability

- Edit topic labels and hints in `worker/src/config/categories.ts` and mirror UI labels in `src/categories.ts`.
- Static variants live separately in `worker/src/fallback/en.json`, `gu.json`, and `hi.json`. Each file contains ten sentences for every category.
- Language/script instructions live in `worker/src/config/languages.ts` and the Gemini prompt in `worker/src/services/geminiService.ts`.
- To change model, set `GEMINI_MODEL`; verify current free-tier eligibility first. No paid-model fallback is configured.
