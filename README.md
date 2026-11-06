# PERMA

Mobile PWA for image-assisted dermatology research exams. Experimental: the model returns raw scores. It does not diagnose and it is not clinically validated.

Persistent notice shown in the app: "Prototipo experimental de investigación. Los puntajes no son probabilidades clínicas. No diagnostica."

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

Planned: the mock client belongs to the `src/core/inference` module, which is not in this branch yet. Until it lands, the flag has no effect. Every simulated value must carry the badge "Modelo simulado" and must never be exported as a real result.

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

Known state: `tests/e2e/` has no specs yet, so `bun run e2e` exits 1 with "No tests found". This is intentional until the first specs land.

## Environment variables

Vite embeds only `VITE_*` variables in the client bundle. Everything in a `.env*` file is public. Do not put secrets there.

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_INFERENCE` | `live` | `live` calls the backend; `mock` uses simulated values (planned, see above) |
| `VITE_DEFAULT_MODEL` | `B71` | Model selected first in the UI (`A71` or `B71`) |
| `VITE_API_ORIGIN` | `https://derm.nicolasmoreno.site` | Dev-proxy target for `/api` |

Gotcha: `vite.config.ts` reads `process.env.VITE_API_ORIGIN`, not the `.env` files. To change the proxy target, export it in the shell: `VITE_API_ORIGIN=https://other.example bun run dev`. Copy `.env.example` to `.env.local` for the other two variables.

## Deploy

Nothing is deployed from this repository yet. Examples live in `deploy/` and are not applied:

- `public/_headers`: security headers and cache policy for static hosts (Cloudflare Pages / Netlify syntax). Copied into `dist/`.
- `deploy/nginx/perma.conf.example`: static files plus `/api` reverse proxy.
- `deploy/vercel/vercel.json.example`: rewrites and headers.
- `deploy/cloudflare/worker-api-proxy.js.example`: Worker that proxies `/api/*` and serves assets.

The `/api` proxy must keep the browser on the same origin (`connect-src 'self'`) and must never cache responses. See `docs/security.md`.

## Documentation

- `docs/BRIEF.md`: product and engineering brief (read first).
- `docs/adr/`: architecture decision records R1 to R5.
- `docs/tech-decisions.md`: index of decisions, with dates, sources and risks.
- `docs/security.md`: threat model, headers rationale, data handling.
- `DESIGN.md`: visual system.
