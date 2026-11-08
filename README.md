# PERMA

Mobile PWA for image-assisted dermatology research. The model returns relative category scores, not a person's probability of disease. It does not replace clinical assessment and is not clinically validated.

Persistent research notice: "Esta es una herramienta de IA en investigación. No reemplaza la valoración clínica ni emite diagnósticos."

The current live integration is `MOCO_HAM7`, a seven-category research classifier evaluated on HAM dermoscopy development data. Ordinary smartphone photographs are not equivalent to dermoscopy. Camera or file selection does not establish image suitability, diagnostic validity, or a safe clinical decision. The API also exposes a separate PAD6 head, but this frontend does not implement its six-category contract; it must not be selected or relabeled silently.

## Requirements

- Node 24 (CI uses Node 24; the engines of vitest, size-limit and msw require >= 22.12).
- Bun >= 1.3 (lockfile `bun.lock`; Node >= 22 is still used by Vite and Playwright).

## Install and run

```sh
bun install --frozen-lockfile                  # reproducible install from bun.lock
bun run dev             # Vite dev server; proxies /api to VITE_API_ORIGIN
bun run preview         # serves the last build from dist/ (needs bun run build first)
```

## Mock inference

```sh
VITE_INFERENCE=mock bun run dev
```

The mock client in `src/core/inference` generates local demonstration values without analyzing the submitted image. Simulated output carries the "Modelo simulado" badge and retains its mock provenance in exports. Use mock mode for deterministic flow tests, never as a fallback for failed live inference.

## Build, test, quality

| Command | What it does |
| --- | --- |
| `bun run typecheck` | `tsc --noEmit` over `src/`, `tests/`, configs |
| `bun run lint` | ESLint (typescript-eslint, react-hooks rules) |
| `bun run test` | Vitest unit tests (jsdom), `tests/unit/**` and `src/**/*.test.*` |
| `bun run build` | Typecheck, then production build into `dist/` with the PWA service worker |
| `node scripts/check-no-msw-in-dist.mjs` | Fails (exit 1) if MSW strings reach `dist/`; exit 2 if `dist/` is missing |
| `bun run size` | size-limit on the initial JS (budget 170 kB gzip). Run `bun run build` first |
| `./node_modules/.bin/lhci autorun --config=lighthouserc.json` | Lighthouse CI on `dist/` (mobile, LCP <= 2.5 s, CLS <= 0.05). Run `bun run build` first |
| `bun run e2e` | Playwright. Builds `dist-e2e/` with `VITE_INFERENCE=mock`, then serves it on port 4173 |

Typical pre-PR sequence:

```sh
bun run typecheck && bun run lint && bun run test
bun run build && node scripts/check-no-msw-in-dist.mjs && bun run size
```

Flow specifications live in `tests/e2e/flows/`. The flow runner uses a mock build in `/tmp`, leaving the production build and shared inference API untouched. Browser emulation does not replace testing on a physical phone.

## Environment variables

Vite embeds only `VITE_*` variables in the client bundle. Everything in a `.env*` file is public. Do not put secrets there.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_INFERENCE` | `live` | `live` calls the configured research backend; `mock` uses explicitly simulated values |
| `VITE_DEFAULT_MODEL` | `MOCO_HAM7` | Only supported live model. Legacy A71/B71 and `next` are mock-only; invalid live choices fail rather than silently switching models. |
| `VITE_API_ORIGIN` | `https://derm.nicolasmoreno.site` | Dev-proxy target for `/api` |

Gotcha: `vite.config.ts` reads `process.env.VITE_API_ORIGIN`, not the `.env` files. To change the proxy target, export it in the shell: `VITE_API_ORIGIN=https://other.example bun run dev`. Copy `.env.example` to `.env.local` for the other two variables.

## Deploy

The existing Vercel project is `perma`, served at `https://perma.tikno.pro`. The root `vercel.json` builds live inference, proxies `/api/*` to the configured research backend, and applies security/cache headers. Do not deploy mock bundles or cache API responses.

Additional hosting examples remain in `deploy/`:

- `public/_headers`: security headers and cache policy for static hosts (Cloudflare Pages / Netlify syntax). Copied into `dist/`.
- `deploy/nginx/perma.conf.example`: static files plus `/api` reverse proxy.
- `deploy/vercel/vercel.json.example`: rewrites and headers.
- `deploy/cloudflare/worker-api-proxy.js.example`: Worker that proxies `/api/*` and serves assets.

The `/api` proxy must keep the browser on the same origin (`connect-src 'self'`) and must never cache responses. See `docs/security.md`.

## Reading a result

The workflow records the user's context, prepares an image locally, asks for authorization before sending it, requests the research model's output, and lets the user add observations and export a record. Image preparation is not lesion segmentation or a diagnostic quality check. The seven scores describe how HAM7 distributes its output across known categories; even a high score does not confirm or rule out a condition. The model can still assign a category to an unfamiliar image.

Records and image snapshots are stored locally in this browser's IndexedDB. The image selected for inference is also sent to the configured server when the user confirms sending. Do not infer a server retention/deletion guarantee from the local storage policy, and do not describe a research record as a patient consultation or a medical record.

## Documentation

- `docs/BRIEF.md`: product and engineering brief (read first).
- `docs/adr/`: architecture decision records R1 to R5.
- `docs/tech-decisions.md`: index of decisions, with dates, sources and risks.
- `docs/security.md`: threat model, headers rationale, data handling.
- `DESIGN.md`: visual system.
