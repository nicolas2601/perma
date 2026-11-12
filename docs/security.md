# Security and platform hardening

Status: 2026-11-05. Applies to the static PWA (`dist/`) and to the reverse proxy that serves `/api`. Headers are an example policy and are not yet verified in a browser or on a deployed host.

## Data and privacy boundaries

- No patient images are stored or shipped. The only bundled image is the public reference photo (P. Tschandl, CC BY-SA 4.0), with attribution visible in the UI.
- Images leave the device only on an explicit "send" action to `/api/predict`. Camera guidance runs on-device in a worker. No camera frame leaves the device or is stored.
- The service worker never caches `/api` responses (`NetworkOnly`, `navigateFallbackDenylist: [/^\/api/]`). A cached predict response could show another image's result.
- Simulated values (mock mode) carry the badge "Modelo simulado" and `source: "mock"`, and must never be exported as real.
- `VITE_*` variables are embedded in the public bundle. No secret may use that prefix or live in `.env*` files.

## Threat model (short)

| Threat | Control | Residual risk |
| --- | --- | --- |
| XSS through injected markup or third-party script | CSP `script-src 'self'`, no `unsafe-eval`, no `unsafe-inline` for scripts; React escapes text by default | No browser run has confirmed the policy yet. Verify with the console and Playwright before enabling in production. |
| Clickjacking | `frame-ancestors 'none'` (CSP) | Legacy browsers ignore CSP; add `X-Frame-Options: DENY` at the edge if needed. |
| Mock or test code shipped to users | `scripts/check-no-msw-in-dist.mjs` fails the build when `mockServiceWorker`, `msw`, `setupWorker` or `setupServer` appear in `dist/`. MSW is node-only in tests (ADR R5, decision 6). | String scan, not a bundle analysis. Minified names can evade it. Its CI wiring is pending (see below). |
| Stale or cached backend responses | `/api` is `no-store` at the proxy and `NetworkOnly` in the service worker | Relies on the proxy config being deployed as written. |
| Silent loss of an in-progress review on update | `UpdatePrompt` never reloads while `canReload` is false; `applyUpdate` is also guarded in the hook | The user may postpone updates indefinitely. The waiting worker still activates on the next full load after all tabs close. |
| Camera access by third-party frames | `Permissions-Policy: camera=(self), microphone=(), geolocation=()` | Camera permission still depends on the user prompt. |
| Referrer leakage of exam URLs | `Referrer-Policy: strict-origin-when-cross-origin` | None known. |
| Supply-chain drift | `bun install --frozen-lockfile` with the tracked `bun.lock`; CI runs typecheck, lint, tests, build, size budget | A local `pnpm-lock.yaml` may exist; it is git-ignored and must not be committed or used by CI. |

## Headers and why

The policy lives in `public/_headers`, with equivalent examples in `deploy/`.

- **Content-Security-Policy**: `default-src 'self'` as the base. `img-src` adds `blob:` and `data:` for in-memory previews and inline icons. `worker-src 'self' blob:` allows the camera worker. `connect-src 'self'` keeps the browser on the same origin, so `/api` must be proxied. `object-src 'none'`, `base-uri 'self'` and `form-action 'self'` close common injection vectors.
- **Permissions-Policy**: `camera=(self)` is the requirement. Microphone, geolocation, payment and USB are denied because the app does not use them.
- **Referrer-Policy**: the browser default for modern engines, set explicitly.
- **X-Content-Type-Options: nosniff**: stops MIME sniffing of scripts and styles.

### Cross-origin isolation (COOP / COEP): not set, on purpose

Not needed today. `src/` uses no `SharedArrayBuffer`, no threaded WebAssembly and no `crossOriginIsolated` check. The camera advice runs in a plain worker with a JSON model. Setting COEP `require-corp` would also require every subresource to send CORP, which is a breaking change for no benefit.

Revisit if a threaded WASM runtime is adopted (R2 says heavy runtimes are optional and on demand). Then set `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp`, and verify that every cross-origin resource sends `Cross-Origin-Resource-Policy`.

### HSTS

Set `Strict-Transport-Security` at the TLS edge (host or proxy), not in `_headers`. Start with a short `max-age` and raise it only after HTTPS is verified on every subdomain. Do not submit to the preload list without a decision record.

## Cache policy

| Path | Policy | Why |
| --- | --- | --- |
| `/assets/*`, `/workbox-<hash>.js` | `public, max-age=31536000, immutable` | Content-hashed names; a new build changes the name |
| `/index.html`, `/sw.js` | `no-store` | The shell and the worker decide what runs; they must always revalidate |
| `/registerSW.js`, `/manifest.webmanifest` | `no-cache` | Small, may change between builds |
| `/api/*` | `no-store` | Shared research API; results must not be reused across requests |

## Known gaps and pending work

- `.github/workflows/ci.yml` still greps for `setupWorker|setupServer|mockServiceWorker`. Replace the step with `node scripts/check-no-msw-in-dist.mjs` (exit 0 is required). That file is outside this lane.
- `vite.config.ts` should set `injectRegister: null` explicitly. It is already implied when the app imports `virtual:pwa-register/react` (vite-plugin-pwa 2.0.0, `dist/index.js` lines 253-254 and 391-392), but the explicit setting makes the intent visible.
- `.size-limit.json` measures `dist/registerSW.js`. When `UpdatePrompt` is mounted, the plugin stops emitting that file (see above). Re-check `bun run size` after mounting and update the path if it matches nothing.
- The CSP has not been checked in a browser. Load the production build with `bun run preview`, open the console and look for CSP violations, including any from motion or Radix inline styles.
- Security scan not run in this change. Run the project's scanner before merging security-related changes.
