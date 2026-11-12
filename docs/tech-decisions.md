# Technical decisions index

Status: 2026-11-05. Consolidates the ADRs R1 to R5 in `docs/adr/` and the platform decisions taken in the PWA and deployment lane.

Legend: **Status** is the ADR status as written. **Source** is the evidence used (ADR, local file, library docs). Anything not confirmed by a source or a run is marked **no verificado**.

## ADR index

| ADR | Title | Status | Decision (headline) | Risk |
| --- | --- | --- | --- | --- |
| [R1](adr/R1-pwa.md) | PWA: update flow, precache, `/api` handling, manifest, offline, SW tests | Proposed | `registerType: 'prompt'` with the React hook; precache shell and latin Geist only; `/api` NetworkOnly and outside navigation fallback; Playwright SW tests on Chromium | In-progress review lost on reload (mitigated by the `canReload` gate); offline export unverified |
| [R2](adr/R2-camera-ml.md) | On-device camera capture advice runtime | Proposed | Keep the tiny classifier and deterministic rules; blur head off by default; add a local-glare rule; heavy runtime only on demand | Synthetic evidence only; 0.65 false-alert rate on clean frames for the blur head; nothing measured on real phones |
| [R3](adr/R3-motion.md) | Motion system (motion 14.9.1, View Transitions, reduced motion) | Proposed | `motion/react` only; sheets spring bounce 0 about 240 ms; route transitions with View Transitions (220 ms) and Motion fallback; reduced motion gives a 100 ms crossfade | `animateView` fallback unverified in source; View Transitions support is Chromium-first |
| [R4](adr/R4-ui.md) | UI component sources and accessibility baseline | Proposed | Radix primitives (installed) plus local components styled with `src/styles/tokens.css`; no HeroUI, shadcn or 21st.dev in this release | Manual a11y review still required; axe covers only part of WCAG |
| [R5](adr/R5-quality.md) | Quality gates: e2e, a11y, bundle budget, Lighthouse, mocks, CI | Proposed | Six Chromium viewport projects; mock e2e build into `dist-e2e/`; axe on routes; size-limit 170 kB (decimal) on the entry chunk; LHCI mobile LCP and CLS as errors; MSW node-only in tests | Budget covers only the entry chunk (shared chunks can hide); `e2e` has no specs yet; Lighthouse is lab data |

## Platform decisions (2026-11-05)

| ID | Decision | Source | Risk |
| --- | --- | --- | --- |
| P-01 | Update is a prompt, never a silent reload. `applyUpdate` is blocked while `canReload` is false (an unsaved review is open). | R1-01; BRIEF ("no silent reload"); `src/app/pwa/updateState.ts`, tests in `tests/unit/platform/` | The user can postpone indefinitely; the waiting worker only activates on a full load. |
| P-02 | Registration goes through the vite-plugin-pwa React hook. The plugin then injects no separate `registerSW` script. | Source: `node_modules/vite-plugin-pwa/dist/index.js` lines 253-254, 391-392, 1019 (verified by reading the code, not by a build with the hook mounted) | Once the hook is mounted, `dist/registerSW.js` may not be emitted, so the `.size-limit.json` path could match nothing. Verify after mounting. |
| P-03 | Strict CSP: `default-src 'self'`, `script-src 'self'`, no `unsafe-eval`, `connect-src 'self'`, `worker-src 'self' blob:`, `img-src 'self' blob: data:`, `frame-ancestors 'none'`. | BRIEF; this lane; `public/_headers` | **no verificado en navegador.** Motion or Radix inline styles could be blocked; check the console on the production build. |
| P-04 | `Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=(), usb=()`. | BRIEF (camera only) | **no verificado** on real devices or iOS Safari. |
| P-05 | `Referrer-Policy: strict-origin-when-cross-origin`, `X-Content-Type-Options: nosniff`. | Browser defaults made explicit | Low. |
| P-06 | COOP and COEP are not set. | Code search: no `SharedArrayBuffer`, no threaded WASM, no `crossOriginIsolated` in `src/` (2026-11-05) | Blocks a future threaded WASM runtime; the setting must then be revisited (see `docs/security.md`). |
| P-07 | Cache policy: immutable for `/assets/*` and hashed workbox chunks; `no-store` for `index.html`, `sw.js` and `/api/*`; `no-cache` for `registerSW.js` and the manifest. | BRIEF (no-store for shell and API); `public/_headers` | Stale shell if an edge ignores `no-store`. Confirm with `curl -sI` after deploy. |
| P-08 | `/api` is same-origin through a reverse proxy (nginx, Vercel rewrite or Cloudflare Worker, examples in `deploy/`). It is never cached. | BRIEF; `vite.config.ts` dev proxy | **no verificado** on the real host. The examples are not deployed. |
| P-09 | MSW guard script `scripts/check-no-msw-in-dist.mjs` fails closed (exit 2 if `dist/` is missing). | BRIEF (MSW never in production); R5 decision 6 | String match, not a bundle analysis. Its CI step is pending because `ci.yml` is outside this lane. |
| P-10 | Icons: `pwa-192.png`, `pwa-512.png` and `pwa-maskable-512.png` in the manifest, and `apple-touch-icon-180.png` in `index.html`. | `vite.config.ts` on `develop`; `index.html` | **no verificado**: maskable safe zone not checked with a preview tool; R1 recommends a 192 px maskable too (not present). |
| P-11 | Public image for the reference is the only bundled photo, with attribution. | BRIEF | Licence obligations (CC BY-SA 4.0) apply to any derivative. |

## Open items

- Wire the MSW guard into `ci.yml` (replace the grep step). Owner: CI lane.
- Set `injectRegister: null` and the `workbox` settings in `vite.config.ts` as the R1 ADR suggests. Owner: build lane.
- Mount `UpdatePrompt` in the app shell with `canReload` driven by the record state. Owner: state and shell lane.
- Re-check the size-limit path after mounting the hook (P-02).
