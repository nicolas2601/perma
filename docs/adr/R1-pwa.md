# R1 - PWA decisions (vite-plugin-pwa, service worker, manifest, offline, tests)

- Date: 2026-11-05
- Lane: R1 PWA researcher (Research squad)
- Status: proposed (no code changed in this lane)
- Sources legend:
  - [C7-PWA] Context7 `/vite-pwa/vite-plugin-pwa` docs (queried 2026-11-05)
  - [C7-PW] Context7 `/microsoft/playwright` docs (queried 2026-11-05)
  - [LOCAL] local files: `vite.config.ts`, `tsconfig.json`, `package.json`, `node_modules/*` versions and type files
  - "no verificado" = no source confirmed it; treat as hypothesis to test in the build

## Facts gathered

- [LOCAL] `vite` 8.3.6 and `vite-plugin-pwa` 2.0.0 are installed. `vite-plugin-pwa` v2 peerDeps accept `vite ^8.0.0` [C7-PWA].
- [LOCAL] `vite-plugin-pwa` v2 declares `workbox-build` and `workbox-window` as direct dependencies (auto-installed). No manual install needed [C7-PWA].
- [LOCAL] `tsconfig.json` already has `"types": ["vite/client","vite-plugin-pwa/client"]`. `node_modules/vite-plugin-pwa/react.d.ts` exports `useRegisterSW` from `virtual:pwa-register/react`.
- [LOCAL] `src/main.tsx` imports `@fontsource-variable/geist`. Installed subsets are `latin`, `latin-ext`, `cyrillic`, `cyrillic-ext`, `vietnamese` (wght-normal woff2 each).
- [LOCAL] `public/` does not exist. The manifest has `icons: []`. There are no icon files yet.
- [LOCAL] Current `vite.config.ts` glob is `**/*.{js,css,html,woff2,svg,webp,avif,png}` with no `globIgnores`. This precaches ALL five Geist subsets, which violates the brief (shell + latin fonts only). This is a bug in the current config.
- [C7-PWA] `navigateFallbackDenylist` regex list excludes routes from SW navigation fallback. Excluded routes show "No internet connection" when offline.
- [C7-PWA] `registerType: 'prompt'` requires importing the virtual module. `onNeedRefresh` shows a prompt. The "refresh" action calls `updateSW()`, which reloads the page with updated content.
- [C7-PWA] Minimal installability: viewport meta, title, description, favicon, `apple-touch-icon`, `mask-icon`, `theme-color`. Icons 192x192 and 512x512 are required. A third icon with `purpose: 'any maskable'` is optional.
- [C7-PW] `BrowserContext.serviceWorkers()` lists SWs. `context.waitForEvent('serviceworker')` fires on registration. Service workers are supported only on Chromium-based browsers. `serviceWorkers: 'block'` disables SW registration.
- [C7-PW] `context.setOffline(true)` affects navigations, `fetch` and XHR through the regular network stack.
- [C7-PW] `Page.route` does NOT intercept requests made by a Service Worker. Use `serviceWorkers: 'block'` when mocking/aborting requests with `page.route`.

---

## ADR-R1-01: Use vite-plugin-pwa 2.0.0 with `registerType: 'prompt'` and the React hook

**Decision.** Keep `vite-plugin-pwa` ^2.0.0 with `generateSW` (existing config). Set `registerType: 'prompt'`. Register from React with `useRegisterSW` imported from `virtual:pwa-register/react`. Show a prompt on `needRefresh`. Call `updateServiceWorker(true)` only when the user accepts.

**Alternatives.**
1. `registerType: 'autoUpdate'`. Rejected: the new SW activates and reloads without consent. In this app that can drop an in-progress ABCDE review or comparison.
2. Hand-written SW with `workbox-window` (`injectManifest`). More control (custom `/api` handling, custom update UI), but more code and more tests. Only needed if `generateSW` cannot express a requirement. None found so far.
3. Keep `virtual:pwa-register` (vanilla) with `registerSW`. Works, but the React hook fits the component tree and avoids manual state.

**Why.** Matches the brief (explicit update flow, no silent reload). Plugin v2 supports Vite 8 [C7-PWA][LOCAL]. The React hook exposes `needRefresh` and `updateServiceWorker` as typed state [LOCAL react.d.ts].

**Risk.**
- Accepting the update reloads the page. In-memory exam state (ABCDE answers, notes, consent step) is lost unless persisted. This is the main product risk. Mitigation: show the prompt only on idle screens (Home, Reference) or persist the draft record to IndexedDB/sessionStorage before `updateServiceWorker(true)`. Owner: whoever implements the record store. Not decided here.
- Update checks happen on navigation only by default (no verificado for the interval default). A long single-page session may never see a new SW. Do not add a polling interval to `/sw.js` without a reason; it is cheap, but keep it at visibility-change, not a loop.

**Config snippet (compatible with current `vite.config.ts`, change only the `VitePWA` block):**

```ts
// vite.config.ts (VitePWA block only; rest of file unchanged)
VitePWA({
  registerType: 'prompt',
  injectRegister: null, // registration is done by the app via the React hook
  workbox: {
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api/],
    globPatterns: ['**/*.{js,css,html,svg,webp,avif,png,woff2}'],
    globIgnores: ['**/geist-{cyrillic,cyrillic-ext,latin-ext,vietnamese}-*.woff2'],
    runtimeCaching: [{ urlPattern: /^\/api\//, handler: 'NetworkOnly' }],
  },
  manifest: { /* see ADR-R1-04 */ },
}),
```

```tsx
// src/pwa/useAppUpdate.ts (sketch; name and location are proposals)
import { useRegisterSW } from 'virtual:pwa-register/react';

export function useAppUpdate() {
  const { needRefresh: [needRefresh, setNeedRefresh], offlineReady: [offlineReady, setOfflineReady], updateServiceWorker } =
    useRegisterSW();
  return {
    needRefresh, offlineReady,
    applyUpdate: () => updateServiceWorker(true),
    dismiss: () => setNeedRefresh(false),
    dismissOffline: () => setOfflineReady(false),
  };
}
```

Note: `injectRegister` accepts `'inline' | 'script' | 'script-defer' | 'auto' | null | false` (verified in `node_modules/vite-plugin-pwa/dist/index.d.ts` line 332). `null` disables the auto-injected registration script, so the app's hook is the only registration. Confirm the build output has no duplicate `registerSW` call.

**Verification.** `npm run build`, then serve `dist/` with `vite preview` (not `vite dev`, which does not emit `sw.js` by default; no verificado).

---

## ADR-R1-02: Precache only the app shell and the latin Geist subset

**Decision.** Precache `js`, `css`, `html`, `svg`, `webp`, `avif`, `png`, and `woff2`, excluding the non-latin Geist subsets and `latin-ext` by `globIgnores`. Keep `latin` (the one required by the brief) in precache.

**Alternatives.**
1. Keep the current glob (all woff2). Rejected: violates brief (SW precaches shell + fonts only), wastes install bandwidth on Cyrillic/Vietnamese fonts a Spanish UI does not need. Verified in `node_modules/@fontsource-variable/geist/unicode.json`: the `latin` range is U+0000-00FF (includes Spanish á é í ó ú ñ ü ¿ ¡) plus punctuation/currency; `latin-ext` is U+0100+ (Central European letters). Ignoring `latin-ext` does not affect Spanish text.
2. Precache fonts with a runtime `CacheFirst` route instead. Adds runtime complexity for no gain: the subset is small and used on every screen.
3. Precache nothing but HTML. Rejected: offline shell has to render, so JS/CSS and latin font are required.

**Why.** Brief budget and offline shell requirements. Installed fonts are the five subsets listed above [LOCAL]. Fontsource emits hashed file names, so the ignore patterns use the subset prefix (`geist-cyrillic-*`, etc.) (inferencia: names under `dist/assets/` carry a hash suffix; verify with the build output).

**Risk.** The glob `**/*.js` also precaches every lazy chunk (viewer, ABCDE, export, camera, PDF generator). That adds to SW install size but not to initial JS, which satisfies the 170 KB gzip budget. Tradeoff: a large precache vs. offline export working. Keep the ML model (`camera-blur-model.json`) and any model weights out of the glob (they are not matched by the current patterns); they are "on demand".

**Verification (to run in the implementation branch):** `npm run build` then list `dist/sw.js` precache manifest entries: must include `geist-latin-wght-normal` and must NOT include `geist-cyrillic`, `geist-cyrillic-ext`, `geist-latin-ext`, `geist-vietnamese`. Expect none of `/api/` paths.

---

## ADR-R1-03: `/api` is NetworkOnly and excluded from navigation fallback

**Decision.** Keep `runtimeCaching: [{ urlPattern: /^\/api\//, handler: 'NetworkOnly' }]` and `navigateFallbackDenylist: [/^\/api/]` (both already in the repo). Keep `/api` out of `globPatterns` (it is not a file, so it never matches).

**Alternatives.**
1. `NetworkFirst` with cache for `/api/status` (offline status). Rejected: brief says "Service worker never caches /api" and `/api` is a shared research API; caching a predict response could show a stale or other-image result.
2. No runtime route (let the default fetch pass). Functionally similar, but the explicit `NetworkOnly` documents intent and survives later config changes.

**Why.** Brief rule: no-store, never cache `/api`, no hammering. `navigateFallbackDenylist` is the documented way to keep `/api` out of navigation fallback [C7-PWA]. Excluded routes return the browser's offline page when offline, which is acceptable because `/api` is not a page.

**Risk.**
- Offline: `/api` calls fail with a network error. The app must map that to the "offline" recovery scenario in code. The SW does not do it.
- Default workbox route methods: a `runtimeCaching` route matches GET by default (no verificado in fetched docs). `POST /api/predict` is therefore not handled by this route; it goes to the network anyway. Add `method: 'POST'` only if a cache is ever added for POST (not planned).
- Playwright: `Page.route` does not see SW-fetched requests [C7-PW]. Route-based `/api` mocks need `serviceWorkers: 'block'` in those tests (see ADR-R1-06).

---

## ADR-R1-04: Manifest, icons (192/512 + maskable) and iOS head

**Decision.** Replace `icons: []` with real files in `public/`. Use separate files for "any" and "maskable" icons. Add iOS meta to `index.html`.

**Manifest snippet (`VitePWA.manifest`):**

```ts
manifest: {
  name: 'PERMA',
  short_name: 'PERMA',
  description: 'Prototipo experimental de investigación. Los puntajes no son probabilidades clínicas. No diagnostica.',
  lang: 'es',
  dir: 'ltr',
  display: 'standalone',
  start_url: '/',
  scope: '/',
  background_color: '#f2f5f4',
  theme_color: '#006779',
  icons: [
    { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
    { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
    { src: 'pwa-maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
    { src: 'pwa-maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
},
```

Icon sizes 192 and 512 come from [C7-PWA]. The `purpose: 'maskable'` entry shape follows [C7-PWA] (the doc uses `'any maskable'` on one file; splitting into separate files is a safer choice, no verificado beyond the spec). Maskable safe zone (keep logo within the central ~80% circle) is general W3C maskable knowledge, not verified via Context7: check it with a maskable preview tool before shipping.

`description` text is a proposal copied from the brief's persistent notice; it is an English-artifact-friendly string but the notice is Spanish. Keep Spanish here (visible UI copy follows brief).

**iOS head (`index.html`, per [C7-PWA] minimal requirements):**

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<meta name="theme-color" content="#006779" />
<link rel="icon" href="/favicon.ico" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180" />
<link rel="mask-icon" href="/mask-icon.svg" color="#006779" />
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-title" content="PERMA" />
```

`viewport-fit=cover` supports the safe-area requirement in the brief (inferencia, not in fetched docs). `apple-mobile-web-app-capable` and the title meta are no verificado via Context7; they are standard iOS meta but iOS behavior should be checked on a real device (brief limit: nothing measured on real phones).

**Why.** iOS ignores the manifest icons for the home-screen icon; it uses `apple-touch-icon` [C7-PWA minimal requirements]. The current config has no icons, so installability fails the minimal requirements.

**Risk.** Without icon files the build still works but the PWA is not installable. Asset creation is outside this lane. Owner: design (Figma-derived assets, no raw patient data; the logo must not reuse reference photos).

---

## ADR-R1-05: Offline shell behavior

**Decision.** The SW precaches HTML/JS/CSS and the latin font, and falls back to `index.html` for navigations (default `generateSW` behavior with `navigateFallback`). The app renders the shell offline. Any `/api` request fails and the UI shows the "offline" recovery state (one of the 8 scenarios in the brief). No fake data is served from the SW.

**Alternatives.**
1. Serve a dedicated offline HTML page. Adds a page to maintain; the React shell can render the same state with less code.
2. Serve cached mock data offline. Rejected: brief forbids simulated values being exported as real; cache would blur that boundary.

**Why.** Brief: offline is a real recovery scenario; SW precaches shell + fonts only; export acknowledgement must never claim a download that did not happen (if export is offline, it must say so).

**Risk.**
- Offline + deep link: navigation to a route not in precache falls back to `index.html` (SPA behavior). Confirm the router resolves client-side routes (no verificado; check the routing setup).
- Offline export: PDF generator is a lazy chunk. It is precached (glob covers `*.js`) so export can run offline if the chunk loaded at least once or was precached. Verify with a Playwright offline test (ADR-R1-06).
- The cache version is tied to the build. Users with an old shell keep it until they accept the update prompt (intended with `prompt`).

---

## ADR-R1-06: How to test the SW update flow in Playwright

**Decision.** Run SW tests in a separate Playwright project against a production build served by `vite preview`. Keep `serviceWorkers` at default `allow` for update tests; use `serviceWorkers: 'block'` for `/api` mock tests.

**Recipe (update flow).**
1. `npm run build` (build A), then `npx vite preview --port 4173`.
2. Test: `const sw = context.waitForEvent('serviceworker')`; `page.goto('/')`; await `navigator.serviceWorker.ready` via `page.evaluate`. [C7-PW]
3. Replace `dist/` with build B (different content, so `sw.js`/precache hash changes). Build B must be produced before the test, not during.
4. In page: `await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()))`. Expect `registration.waiting` to be non-null and the `needRefresh` prompt to be visible. (The `update()` call and `waiting` check are standard browser APIs; the docs fetched from Playwright do not cover them: "no verificado" against Workbox docs in this lane, verify in the test.)
5. Click the prompt's refresh action. Expect `controllerchange`/reload and the new asset hash in the DOM or network log.
6. Negative test: dismiss the prompt. Expect the old SW still controls the page and the new one stays `waiting`.

**Offline test.** After `ready`, `await context.setOffline(true)`, then `page.reload()`; expect the shell to render and `/api` calls to yield the offline state. [C7-PW] `setOffline` affects navigations and `fetch`; whether it affects SW-served navigations as expected is no verificado until the test runs.

**Why this recipe.** Playwright documents SW access via `context.serviceWorkers()` and the `serviceworker` event [C7-PW]. The update trigger is the only practical way to force a new SW in a test without waiting for a browser update check.

**Risk and limits.**
- Service workers are Chromium-only in Playwright [C7-PW]. Firefox/WebKit SW tests are not possible in this suite; scope the claim to Chromium.
- `Page.route` does not intercept SW requests [C7-PW]. A test that mocks `/api` with `page.route` while SW is active will silently hit the network. Use `serviceWorkers: 'block'` in those projects.
- Playwright via MCP: the brief permits Playwright MCP tools for browser work. The recipe above is for the Playwright test runner; equivalent steps with the MCP are possible but not verified in this lane.

---

## Summary of changes proposed to `vite.config.ts` (for the implementer)

1. Add `globIgnores` to `workbox` to exclude non-latin Geist subsets (ADR-R1-02). This is the only bug found in the current config.
2. Add `navigateFallback: '/index.html'` explicitly (defaults to it in `generateSW`; explicit is clearer; no verificado that this is the default in v2).
3. Replace `icons: []` with the four icon entries (ADR-R1-04).
4. Keep `registerType: 'prompt'`, `navigateFallbackDenylist`, and `NetworkOnly` for `/api` as they are.

## Open items (not decided here)

- Persistence of in-progress exam record before an update reload (ADR-R1-01 risk). Owner: state/persistence lane.
- Icon assets and maskable safe-zone check (ADR-R1-04). Owner: design lane.
- Confirm `injectRegister: null` and `navigateFallback` default against the installed plugin's `dist` type files before merging.
