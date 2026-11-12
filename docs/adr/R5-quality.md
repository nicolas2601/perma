# R5 - Quality gates: e2e, accessibility, bundle budget, Lighthouse, mocks, CI

Status: proposed (research lane R5). Scope: Playwright e2e matrix, @axe-core/playwright, size-limit, Lighthouse CI, MSW 3, Vitest, CI workflow.

Evidence labels: [LOCAL] = read or run in this repo; [C7] = Context7 docs; [INFERENCE] = reasoning, not yet verified by running.

## Facts gathered

- [LOCAL] Installed versions: `@playwright/test` 1.65.0, `vitest` 5.1.0, `msw` 3.0.4, `size-limit` and `@size-limit/file` 14.3.0, `@axe-core/playwright` 4.14.0, `vite` 8.3.6, `typescript` 6.0.3. Registry `latest` matches for all of them.
- [LOCAL] `@lhci/cli` is NOT in `package.json`. Registry latest is 0.16.0 with bin `lhci`. Running `npx lhci` without it downloads an unrelated npm package named `lhci` (observed during this research), so the CI step must use the local bin only.
- [LOCAL] Two lockfiles exist: `package-lock.json` and `pnpm-lock.yaml`, plus `pnpm-workspace.yaml` (with `minimumReleaseAgeExclude`). The lead's commands are `npm run ...`, so this ADR uses npm and `package-lock.json`. The duplicate lockfile must be resolved by the lead (see Lead actions).
- [LOCAL] `npx size-limit --help` exits 0. `npx size-limit` against the existing `dist/` exits 0: `Size: 67.83 kB gzipped`, limit 170 kB.
- [LOCAL] `@size-limit/file` measures brotli when no option is given. `gzip: true` must be explicit (`index.js` step60: `gzip === true` branch first, then `brotli === false` raw, else brotli).
- [LOCAL] size-limit parses `kB` as decimal (1000 bytes, `bytes.js`). `170 kB` = 170,000 bytes, which is stricter than 170 KiB (174,080 bytes). The brief says "170 KB gzip", so decimal was chosen.
- [LOCAL] Playwright `iPhone 13` preset is 390x664 with `defaultBrowserType: 'webkit'`. `Pixel 7` is 412x839. Neither matches the 390x844 target, so viewports are explicit and presets are not used.
- [LOCAL] `npx tsc` with the repo `tsconfig.json` only works with `--ignoreConfig` when files are passed on the command line (TS 6). `tsconfig.json` `include` does not cover `playwright.config.ts`.
- [LOCAL] `npx vite preview --help` and `npx vite build --help` both expose `--outDir`, `--port`, `--strictPort`.
- [LOCAL] `dist/` currently holds one entry chunk (`dist/assets/index-*.js`) plus `dist/registerSW.js`. No lazy or shared chunks exist yet.
- [LOCAL] `tests/e2e/` exists but is empty. `npx playwright test --list` therefore exits 1 with "No tests found" (see Verification).
- [C7] Playwright: `use.reducedMotion` (since 1.50), `use.serviceWorkers: 'block' | 'allow'`, `BrowserContext.setOffline(true)` (affects navigations and fetch, not WebRTC), `webServer` options (`command`, `url`, `reuseExistingServer`, `stdout`, `stderr`, `timeout`).
- [C7] Lighthouse CI: root key `ci`, `collect.startServerCommand` + `startServerReadyPattern` + `url` + `numberOfRuns`, `collect.settings.formFactor/screenEmulation`, `assert.assertions` with `["error", {"maxNumericValue": n}]`, `upload.target: "filesystem"` with `outputDir`.
- [C7] MSW 3: `onUnhandledRequest` does not exist. The option is `onUnhandledFrame` (`'bypass' | 'warn' | 'error'` or callback), default `'warn'`, for both `setupServer().listen()` (msw/node) and `setupWorker().start()` (msw/browser). Exports include `./node`, `./browser`, `./http`, `./mockServiceWorker.js`. `msw init <dir>` copies the worker file.
- [C7] `@axe-core/playwright` exports `AxeBuilder` (confirmed in `node_modules`). The axe tag names used below are standard axe-core tags [INFERENCE: confirm on first run].
- [LOCAL] R1 (PWA ADR) uses `registerType: 'prompt'`, `/api` NetworkOnly, and offline tests via `context.setOffline(true)`. This ADR follows R1. R1-06 proposes swapping `dist/` between two builds; this ADR keeps the e2e build out of `dist/`, so R1-06 must use a separate outDir (see Consequences).

## Decision 1 - Playwright e2e: chromium only, explicit viewport matrix

Chosen: `playwright.config.ts` defines six projects, all Chromium:

| Project                   | Viewport | Touch | DPR | reducedMotion | Scope                                           |
| ------------------------- | -------- | ----- | --- | ------------- | ----------------------------------------------- |
| mobile-320                | 320x568  | yes   | 2   | no-preference | all specs except offline                        |
| mobile-390                | 390x844  | yes   | 2   | no-preference | all specs except offline                        |
| mobile-390-reduced-motion | 390x844  | yes   | 2   | reduce        | all specs except offline                        |
| tablet-768                | 768x1024 | yes   | 2   | no-preference | all specs except offline                        |
| desktop-1280              | 1280x800 | no    | 1   | no-preference | all specs except offline                        |
| offline-sw                | 390x844  | yes   | 2   | no-preference | `**/offline/**` only, `serviceWorkers: 'allow'` |

- Global `use`: `baseURL`, `locale: 'es-CO'`, `timezoneId: 'America/Bogota'`, `serviceWorkers: 'block'` (deterministic runs, SW disabled except in the offline project), `trace: 'on-first-retry'`, `screenshot: 'only-on-failure'`.
- `forbidOnly` and `retries: 2` and `workers: 1` only in CI. `fullyParallel` otherwise.
- Test directory `tests/e2e/`. Subfolder `offline/` is the only one run by `offline-sw`.

Alternatives considered:

1. Playwright device presets (`devices['iPhone 13']`). Rejected: the preset is 390x664 and defaults to WebKit, which would violate the chromium-only CI rule.
2. Separate mobile test files per viewport. Rejected: duplicates specs. Projects run the same specs at each width, which is what responsive checks need.
3. Add Firefox and WebKit. Rejected for CI by the brief (chromium only). Adding a project later is a one-line change.

Tradeoff: six projects multiply run time by six. Mitigation: the full e2e suite runs once per project. Keep per-viewport assertions narrow (layout, touch target, overflow), and keep flow tests on the 390 project.

## Decision 2 - Mock inference in e2e, separate e2e build output

The `webServer` command builds with `VITE_INFERENCE=mock` into `dist-e2e/` and serves that directory with `vite preview --outDir dist-e2e --port 4173 --strictPort`.

- Why mock: the shared research API (`derm.nicolasmoreno.site`) must not be hammered (BRIEF). Mock is deterministic (seeded) and covers the 8 recovery scenarios.
- Why `VITE_INFERENCE=mock` inline in the command and not `webServer.env`: Playwright documents that `env` defaults to inherited `process.env`, but does not say whether a custom `env` replaces it. Inline assignment avoids the ambiguity. Cost: POSIX shells only. Linux (dev and CI) is fine; Windows dev would need `cross-env`.
- Why `dist-e2e/`: `npm run e2e` must not overwrite the production `dist/` that `npm run size` and Lighthouse measure. Requires `dist-e2e/` in `.gitignore` (Lead action).
- `reuseExistingServer: false`: a local preview left over from an older (live) build would silently be tested. The cost is a rebuild on each local run.
- Build cost: CI builds twice (live in `dist/`, mock in `dist-e2e/`). Accepted; a few seconds to tens of seconds.

Verified: `VITE_INFERENCE=mock npx vite build --outDir <tmp>` exits 0; the output is served by `vite preview` (HTTP 200 on `/`).

Open dependency: the mock must be selectable per test (for example a query parameter or a seeded scenario) so that the 8 recovery scenarios can be driven from specs. That is an implementation decision for the inference lane, not this one.

## Decision 3 - Accessibility: @axe-core/playwright on every route

- `new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze()`, asserted to have zero violations of impact `serious` or `critical` at minimum. Run in the viewport projects (the axe result does not change per project, so running it on mobile-390 and desktop-1280 only is enough; the other projects skip it).
- `prefers-reduced-motion` behavior is checked by the `mobile-390-reduced-motion` project (R3 motion decisions: 100 ms crossfade under reduce).
- Targets >= 44 px and reflow are not axe rules; they belong in the Playwright spec (`boundingBox`) and in R4.

Tradeoff: axe automates only a subset of WCAG criteria. Manual review (focus order, ABCDE keyboard flow, screen reader pass) remains necessary and is not covered by this gate.

## Decision 4 - Bundle budget: size-limit 14 with gzip, initial JS only

`.size-limit.json`:

- One check, name "Initial JS (entry + registerSW), gzip".
- Paths: `dist/assets/index-*.js` and `dist/registerSW.js`. Limit `170 kB`, `gzip: true`.
- Measured now: 67.83 kB gzip (40% of budget). Command: `npm run size` after `npm run build`.

Known gap (important): the glob measures the entry chunk only. When code-splitting produces shared or preloaded vendor chunks (React, motion, i18next), they load on first paint but are not in this glob, so the check silently under-measures. Options:

1. Add each shared chunk's glob as it appears. Simple, but manual and easy to forget. (Recommended now, because the current build has one chunk.)
2. A small script that reads `dist/index.html` `<script type="module">` and `<link rel="modulepreload">` and emits the list. Correct, but requires a file outside this lane (e.g. `scripts/initial-chunks.mjs`) and a `size-limit` generated config step.

Units: `kB` is decimal here, so 170 kB = 170,000 bytes (stricter than 170 KiB). Stated explicitly so nobody "fixes" it to KiB.

Also: `npm run size` does not build. In CI the build step runs first. Locally, run `npm run build && npm run size`.

## Decision 5 - Lighthouse CI: mobile, LCP and CLS as errors

`lighthouserc.json`:

- `collect`: `startServerCommand: "npx vite preview --port 4173 --strictPort"` against the live `dist/` (the real artifact), `startServerReadyPattern: "Local"`, `url: ["http://localhost:4173/"]`, `numberOfRuns: 3`, `formFactor: "mobile"`, `screenEmulation` 390x844 DPR 3.
- `assert`: `largest-contentful-paint` maxNumericValue 2500 (ms), `cumulative-layout-shift` maxNumericValue 0.05, both `error`.
- `upload`: `filesystem`, `outputDir: ".lighthouseci"` (no public storage; reports are uploaded as CI artifacts).

Caveats:

- Lighthouse runs in lab mode (simulated throttling). INP (budget 200 ms in BRIEF) is a field metric; the lab proxy is TBT, which is not asserted here. Field INP needs RUM, out of scope.
- The `startServerReadyPattern` depends on Vite printing "Local". Verified by the Vite preview output format [INFERENCE: verify on the first CI run].
- The PWA service worker does not affect LHCI (fresh Chrome profile per run) [INFERENCE].

Tradeoff: `numberOfRuns: 3` with median. Lower variance than 1 run; triples the Lighthouse time.

## Decision 6 - MSW 3: node in Vitest, browser worker deferred, never in production

- Node (`msw/node`): used in Vitest (`tests/setup.ts` or a `tests/msw/server.ts` imported by setup). `server.listen({ onUnhandledFrame: 'error' })` so that any unexpected call to `/api/...` fails the test. Important for the "never hammer the shared API" rule.
- Browser (`msw/browser`): not recommended now. A browser worker requires `mockServiceWorker.js` in a served directory. If placed in `public/`, Vite copies it into `dist/`, and workbox `globPatterns: **/*.js` precaches it, so it would ship to users. Only a dev-only path would be safe.
  - Option A (recommended): no browser MSW. Dev mock mode uses `MockInferenceClient` (already in BRIEF). Zero prod risk, zero extra worker file.
  - Option B: browser MSW for dev only. Guard with `import.meta.env.DEV` plus a dynamic import, and serve the worker from a dev-only location (`msw init` into a folder that is not `public/`, or Vite dev middleware). Cost: more moving parts; only worth it if the mock must intercept real `fetch` paths in the browser.
- Production guard: CI greps `dist/` for `setupWorker|setupServer|mockServiceWorker` and fails if found (implemented in `ci.yml`). Grep on minified output is coarse; it catches the entry points, not every helper.

Verified API: `msw` 3.0.4 exports `./node`, `./browser`, `./http`; `onUnhandledFrame` is the option name [C7].

## Decision 7 - Vitest 5: keep the existing config, scope it away from e2e

No change to `vitest.config.ts`. Its `include` (`tests/unit/**`, `src/**/*.test.*`) does not match `tests/e2e/**/*.spec.ts`, so Vitest and Playwright do not collide. Vitest 5.1.0 requires Node `^22.12.0 || ^24.0.0 || >=26.0.0`. Config API (`defineConfig` from `vitest/config`, `test.environment`, `test.setupFiles`, `test.include`, `globals`) confirmed in current docs [C7].

## Decision 8 - CI workflow

`.github/workflows/ci.yml` (triggers: push to `main`/`develop`, PR to `develop`; `permissions: contents: read`; concurrency cancels superseded runs):

1. `npm ci` (Node 24, npm cache)
2. `npm run typecheck`
3. `npm run lint`
4. `npm run test`
5. `npm run build` (live)
6. MSW-in-prod guard (grep `dist/`)
7. `npm run size`
8. `./node_modules/.bin/lhci autorun --config=lighthouserc.json` (local bin only, fails closed)
9. `npx playwright install --with-deps chromium`
10. `npm run e2e` (chromium, all viewport projects; webServer builds `dist-e2e` in mock mode)
11. Upload `playwright-report/`, `test-results/`, `.lighthouseci/` (`if: always()`, 14 days)

Node 24 satisfies all engine ranges: vite `>=22.12` or `^20.19`, vitest `^24.0.0`, size-limit `^24.5.0`, msw `>=22.12`.

Action versions (`checkout@v4`, `setup-node@v4`, `upload-artifact@v4`) are not version-verified against the current marketplace [INFERENCE]; pin or bump on first run.

## Consequences

- `package.json` needs `@lhci/cli` as a devDependency (version `^0.16.0`). Without it, step 8 fails closed, by design.
- `npm run e2e` with zero spec files exits 1 ("No tests found"). This is the state of the repo today. Add `--pass-with-no-tests` only if the lead wants the empty-suite state to be green; the default is to fail.
- R1-06 (SW update test) proposes replacing `dist/` between builds. It conflicts with `dist-e2e/`. It should build into its own directory.
- Playwright `reuseExistingServer: false` means local e2e runs always rebuild (cost: time, not correctness).
- Only the entry chunk is budgeted. Revisit when lazy and shared chunks appear (Decision 4).

## Lead actions (not done in this lane)

1. `package.json`: add devDependency `"@lhci/cli": "^0.16.0"`. No script changes are required (`e2e`, `size` exist). Optional: `"lhci": "lhci autorun --config=lighthouserc.json"`.
2. `.gitignore`: add `dist-e2e/` and `.lighthouseci/`. (`playwright-report` and `test-results` are already ignored.)
3. Lockfiles: decide npm or pnpm. Repo has both `package-lock.json` and `pnpm-lock.yaml`, and `pnpm-workspace.yaml`. This ADR and `ci.yml` assume npm (`npm ci`). If pnpm wins, switch `ci.yml` to `pnpm/action-setup` + `pnpm install --frozen-lockfile` and keep `pnpm-lock.yaml`.
4. `tsconfig.json` `include` does not include `playwright.config.ts`. Add it (or accept that `npm run build` does not typecheck it; `eslint` still covers it).
5. `tests/e2e/` specs: first specs should cover the 8 recovery scenarios through the mock, the axe check, and the offline shell (R1-06).
6. Decide Decision 6 Option A vs B.

## Verification performed (this lane)

| Check                                                     | Command                                                                     | Result                                                                |
| --------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Playwright config parses and discovers the project matrix | `npx playwright test --list`                                                | Parsed. Exit 1 only because `tests/e2e/` is empty ("No tests found"). |
| Playwright config parses with zero specs allowed          | `npx playwright test --list --pass-with-no-tests`                           | Exit 0, "Total: 0 tests in 0 files"                                   |
| size-limit CLI                                            | `npx size-limit --help`                                                     | Exit 0                                                                |
| size-limit run on existing dist                           | `npx size-limit`                                                            | Exit 0, 67.83 kB gzip of 170 kB                                       |
| JSON validity                                             | `node -e JSON.parse` on `.size-limit.json`, `lighthouserc.json`             | OK                                                                    |
| YAML validity                                             | `js-yaml` load of `ci.yml`                                                  | OK                                                                    |
| Playwright config types                                   | `npx tsc --ignoreConfig --noEmit --strict ... playwright.config.ts`         | Exit 0                                                                |
| Lint and format                                           | `npx eslint playwright.config.ts`; `npx prettier --check` on the four files | Exit 0                                                                |
| Mock e2e build                                            | `VITE_INFERENCE=mock npx vite build --outDir <tmp>`                         | Exit 0                                                                |
| Preview serves the build                                  | `npx vite preview --outDir <tmp> --port 4199` then HTTP GET `/`             | HTTP 200                                                              |

Not verified (requires CI or specs): Lighthouse run, axe run, offline SW test, the 6-project e2e run.
