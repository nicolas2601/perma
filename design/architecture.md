# PERMA: route map, exam state machine and view matrix

Owner: fc-ux-architect (Stage 1, Direction). Writable lane: this file and the `route`/`state` fields of `docs/figma-manifest.json`.
Source of truth: Figma flow page `141:2245` (read-only), `docs/BRIEF.md`, `docs/figma-manifest.json`.

## 0. Evidence and limits

- Manifest: 48 views + 2 extras (`328:285` abcdeSheet, `331:276` homeArt) read in full.
- Figma screenshots (390x844, `get_screenshot`, session `3beb5bd5-4beb-4859-a3cd-fdaf69894f6f`) downloaded to a fresh directory `/tmp/perma-figma-shots-1793937142/` for: home `141:2341`, consent `141:2847`, processing `141:2876`, result `141:2926`, viewer `141:3102`, abcde `141:3252`, export `141:3633`, permission `141:2722`.
- Visually inspected: consent, processing, abcde. The other five are NOT inspected; their route/state rows are derived from the view name, phase and BRIEF (marked INFERENCE in section 5).
- `get_metadata` on `141:2245` was not called (output size); node-level calls only.
- No routing exists in `src/` yet; `design/` was empty; `react-router` is not in `package.json`.

## 1. Router decision

Recommendation: a tiny typed router built on the History API (about 100 lines, zero dependencies), with the route table as plain data.

Reasons:
- The exam is a state machine. The reducer decides which routes are legal (section 6, G10). Routes do not need loaders, nested layouts or data APIs, which are the main reasons to adopt react-router.
- The initial JS budget is 170 KB gzip and the router is not the risk. I did not measure react-router's gzip size here, so this is not a size-based argument; measure with `size-limit` before choosing.
- The route table is data, so migrating to react-router later is a mechanical change.

Costs we accept (tradeoffs):
- We own scroll restoration, focus-on-navigate, `popstate` handling and View Transitions wiring (220 ms per BRIEF).
- Mitigation: one `useRoute` hook and one `navigate` function; sheets close before route pop.

Confidence about the custom router being sufficient: about 70%. Trigger to switch to react-router: nested layouts for the viewer tabs with independent loaders, or more than about 60 routes.

History vs hash: use History API with clean URLs. This needs an SPA fallback on the host to `index.html` and a `navigateFallback` in vite-plugin-pwa that excludes `/api/`. The production host configuration is NOT known to me; if it cannot rewrite, switch to hash routing. Open item O1.

## 2. Route map

Pages have their own URL. Sheets are overlays on the route shown in "Host". Recovery pages are routes so a reload keeps the user on the error, with `returnTo` held in the reducer context (not in the URL).

| Route | Kind | Figma view(s) |
|---|---|---|
| `/` | page | home (`141:2341`); host for scope, discard, homeArt |
| `/contexto` | page | context `141:2444`; host for contextDetails, siteSheet |
| `/imagen` | page | capture `141:2525`; host for cameraPrimer |
| `/imagen/camara` | page | camera `141:2577` |
| `/imagen/muestras` | page | gallery `141:2602` |
| `/imagen/calidad` | page | quality `141:2627`; host for qualityIssue |
| `/envio` | page | consent `141:2847` |
| `/envio/procesando` | page | processing `141:2876`; host for stopWaiting |
| `/resultado` | page | result `141:2926`; host for modelDetails |
| `/resultado/clases` | page | classes `141:2968` |
| `/resultado/clases/:clase` | page | classDetail `141:3041` |
| `/inspeccion?tab=imagen\|salida\|observaciones` | page | viewer `141:3102`; host for toolSheet |
| `/inspeccion/original` | page | original `141:3177` |
| `/inspeccion/zoom` | page | zoom `141:3199` |
| `/examen/abcde` | page | abcde `141:3252`, abcdeSheet `328:285`; `?criterio=a..e` for B-E frames (`141:3292`, `141:3331`, `141:3371`, `141:3413`) |
| `/examen/calibracion` | page | calibration `141:3455` (semantics open, O3) |
| `/examen/calibracion/lista` | page | calibrationReady `141:3480` (O3) |
| `/examen/previo` | page | prior `141:3508` (O3) |
| `/examen/comparar` | page | compare `141:3531`; host for notesSheet |
| `/revision` | page | summary `141:3581` |
| `/revision/exportar` | page | export `141:3633`; host for exportOptions |
| `/revision/exportada` | page | exportDone `141:3782` |
| `/guia` | page | guide `141:3807` |
| `/guia/privacidad` | page | privacy `141:3841` |
| `/investigacion/tono` | page, dev-only | tone `141:3869` (never in production bundle) |
| `/recuperacion/archivo` | page | fileError `141:2685` |
| `/recuperacion/permiso` | page | permission `141:2722` |
| `/recuperacion/sin-conexion` | page | offline `141:2745` |
| `/recuperacion/servidor` | page | error `141:2768` |
| `/recuperacion/tiempo` | page | timeout `141:2788` |
| `/recuperacion/respuesta` | page | contractError `141:2805` |
| `/recuperacion/limite` | page | rateLimit `141:2828` |
| `/recuperacion/exportacion` | page | exportError `141:2705` |

Unknown route or a route whose guard fails: redirect to the nearest legal route (G10), never a blank screen.

## 3. Exam state machine (reducer, no XState)

States: `idle`, `contextSet`, `capturing`, `reviewing`, `consenting`, `processing`, `result`, `inspecting`, `abcde`, `compare`, `exporting`, `exported`, plus 8 recovery states `recoverFile`, `recoverPermission`, `recoverOffline`, `recoverServer`, `recoverTimeout`, `recoverContract`, `recoverRateLimit`, `recoverExport`. Reference pages (guide, privacy, tone) are not states; they keep the current state (`(any)` in the manifest).

Main path:
`idle -> contextSet -> capturing -> reviewing -> consenting -> processing -> result -> inspecting -> abcde -> compare -> exporting -> exported`

Allowed back transitions (user "back"): `contextSet->idle`, `capturing->contextSet`, `reviewing->capturing` (discards image), `consenting->reviewing`, `result->idle`, `inspecting->result`, `abcde->inspecting`, `compare->abcde`, `exporting->compare`, `exported->idle` (only after a new record is requested).

Events (the reducer input):
`CONTEXT_SAVE`, `CONTEXT_SKIP`, `SOURCE_CHOOSE{file|camera|sample}`, `CAMERA_GRANTED`, `CAMERA_DENIED`, `FRAME_CAPTURED`, `FILE_REJECTED`, `IMAGE_LOADED`, `QUALITY_RESULT`, `CONFIRM_IMAGE`, `CONSENT_SET{bool}`, `SEND`, `NET_OFFLINE`, `SERVER_ERROR`, `TIMEOUT`, `CONTRACT_INVALID`, `RATE_LIMITED`, `STOP_WAIT`, `RESULT_OK`, `OPEN_INSPECT`, `SET_TAB`, `EDIT_CRITERION{criterion, option|unanswered}`, `SAVE_NOTE`, `COMPARE_SAVE`, `ACK_RECORD{bool}`, `EXPORT_REQUEST{format}`, `EXPORT_DONE` (only from a real download completion), `EXPORT_FAIL`, `RECOVER{retry|back}`, `DISCARD_RECORD`, `NEW_RECORD`, `SET_LOCALE{es|en}`.

Recovery transitions (all preserve the record):

| Recovery state | Entered from (event) | Return target on RECOVER back | Return target on RECOVER retry |
|---|---|---|---|
| recoverFile | capturing or reviewing on FILE_REJECTED | capturing | capturing (re-pick) |
| recoverPermission | capturing on CAMERA_DENIED | capturing | capturing (camera re-request, one prompt) |
| recoverOffline | consenting or processing on NET_OFFLINE | reviewing | consenting (user must press SEND again) |
| recoverServer | processing on SERVER_ERROR | reviewing | consenting |
| recoverTimeout | processing on TIMEOUT | reviewing | consenting |
| recoverContract | processing on CONTRACT_INVALID | reviewing | consenting. Partial payload never rendered. |
| recoverRateLimit | processing on RATE_LIMITED | reviewing | consenting. No auto-retry; button stays disabled until the user acts. |
| recoverExport | exporting on EXPORT_FAIL | compare | exporting |

Processing rules: `processing` has one in-flight request (single-flight). Back gesture or "Detener la espera" opens `stopWaiting`; confirming it aborts the local wait, keeps the image, and returns to `reviewing` (the image is kept, consent must be pressed again before any new SEND). The server may still finish; a late response after stop is discarded, not shown.

## 4. Global guard rules

- G1 Send: `SEND` is accepted only in `consenting` with `consent=true`, an image present, network online, and no in-flight request. Anything else is ignored and logged to the console in dev.
- G2 No duplicate sends: the SEND control is disabled while `processing`. No automatic retry anywhere (BRIEF: never loop, never hammer).
- G3 Rate limit: 429 goes to `recoverRateLimit`; no timer-driven retry.
- G4 Export acknowledgement: `EXPORT_DONE` moves to `exported` only from a real download completion event. If the download did not happen, the screen must not claim it; route to `recoverExport`.
- G5 Acknowledgement invalidation: `ack` is stored with a `recordHash` (hash over the canonical record: image digest, ABCDE values including "Sin evaluar", note, compare selection, classes). The ack is cleared only when the current `recordHash` differs from the stored one.
- G6 Language never invalidates: `recordHash` excludes locale. `SET_LOCALE` only changes fixed UI copy, not the record and not the ack.
- G7 Unanswered ABCDE criteria are stored as the explicit value `unanswered` and render as "Sin evaluar"; they are never omitted or defaulted.
- G8 Simulated output: any value with `source:"mock"` shows "Modelo simulado" and is exported only with the simulated label, never as a real result. No invented fields (no mask, heatmap, risk, OOD) in any state.
- G9 Image privacy: the image leaves the device only through `SEND` in `processing`. Camera frames are never stored or uploaded; the reference image is the only one in the mock/demo path and carries attribution.
- G10 Deep-link guard: a route whose required state is absent redirects to the nearest legal route. Examples: `/resultado` without a result goes to `/imagen`; `/examen/abcde` without a record goes to `/`; `/revision/exportada` without a real download goes to `/revision`.
- G11 Back: system back closes an open sheet first; only then it navigates. Back never leaves `processing` without `stopWaiting`.
- G12 Discard: `DISCARD_RECORD` clears the image, ABCDE, note and ack in one transition. Reference pages never discard anything.

## 5. State and route matrix (48 views + 2 extras)

Kind: P = page, S = sheet (overlay on Host). "Back" is the target of the back control or system back. INFERENCE = not visually inspected, derived from name, phase and BRIEF.

| # | View | nodeId | Kind | Route | State | Trigger | Back | Data needed | Recovery link |
|---|---|---|---|---|---|---|---|---|---|
| 1 | home | 141:2341 | P | `/` | idle | app open, nav | none (root) | static copy, art | none |
| 2 | scope | 141:2397 | S (host `/`) | `/` | idle | scope action | close | static | none |
| 3 | discard | 141:2420 | S (host `/`) | `/` | idle | discard action | cancel | record presence | none |
| 4 | context | 141:2444 | P | `/contexto` | idle | "Empiece con contexto" | `/` | optional body site | none |
| 5 | contextDetails | 141:2468 | S (host `/contexto`) | `/contexto` | idle | details | close | static | none |
| 6 | siteSheet | 141:2490 | S (host `/contexto`) | `/contexto` | idle | site selector | close | fixed site list | none |
| 7 | capture | 141:2525 | P | `/imagen` | contextSet | "Prepare una imagen" | `/contexto` | none | recoverFile |
| 8 | cameraPrimer | 141:2551 | S (host `/imagen`) | `/imagen` | contextSet | camera option | close | permission state | recoverPermission |
| 9 | camera | 141:2577 | P | `/imagen/camara` | capturing | primer continue | `/imagen` (stops stream) | stream, guide | recoverPermission |
| 10 | gallery | 141:2602 | P | `/imagen/muestras` | capturing | sample option | `/imagen` | fixed sample list | recoverFile |
| 11 | quality | 141:2627 | P | `/imagen/calidad` | reviewing | image loaded | `/imagen` (discards image) | image, quality result | recoverFile |
| 12 | qualityIssue | 141:2658 | S (host `/imagen/calidad`) | `/imagen/calidad` | reviewing | issue tap | close | issue type | none |
| 13 | fileError | 141:2685 | P | `/recuperacion/archivo` | recoverFile | FILE_REJECTED | returnTo `/imagen` | error kind | self |
| 14 | exportError | 141:2705 | P | `/recuperacion/exportacion` | recoverExport | EXPORT_FAIL | `/examen/comparar` | error kind | self |
| 15 | permission | 141:2722 | P | `/recuperacion/permiso` | recoverPermission | CAMERA_DENIED | `/imagen` | permission status | self |
| 16 | offline | 141:2745 | P | `/recuperacion/sin-conexion` | recoverOffline | NET_OFFLINE | `/imagen/calidad` | navigator online flag | self |
| 17 | error | 141:2768 | P | `/recuperacion/servidor` | recoverServer | 5xx | `/imagen/calidad` | status code | self |
| 18 | timeout | 141:2788 | P | `/recuperacion/tiempo` | recoverTimeout | deadline passed | `/imagen/calidad` | elapsed time | self |
| 19 | contractError | 141:2805 | P | `/recuperacion/respuesta` | recoverContract | schema invalid | `/imagen/calidad` | error kind (no payload) | self |
| 20 | rateLimit | 141:2828 | P | `/recuperacion/limite` | recoverRateLimit | 429 | `/imagen/calidad` | retry-after if present (display only) | self |
| 21 | consent | 141:2847 | P | `/envio` | consenting | SEND preparation | `/imagen/calidad` | image, consent flag | recoverOffline |
| 22 | processing | 141:2876 | P | `/envio/procesando` | processing | SEND accepted | back gesture = stopWaiting | request status | recoverTimeout, recoverServer, recoverRateLimit, recoverContract |
| 23 | stopWaiting | 141:2902 | S (host `/envio/procesando`) | `/envio/procesando` | processing | "Detener la espera" | confirm: `/imagen/calidad` (image kept); cancel: close | none | none |
| 24 | result | 141:2926 | P | `/resultado` | result | RESULT_OK | `/` (record kept) | 7 raw scores, source, identity | none |
| 25 | classes | 141:2968 | P | `/resultado/clases` | result | classes entry | `/resultado` | fixed class list | none |
| 26 | classDetail | 141:3041 | P | `/resultado/clases/:clase` | result | class row | `/resultado/clases` | class copy, raw score | none |
| 27 | modelDetails | 141:3068 | S (host `/resultado`) | `/resultado` | result | "Identidad técnica" | close | `/api/status` identity (or mock) | none |
| 28 | viewer | 141:3102 | P | `/inspeccion?tab=…` | inspecting | OPEN_INSPECT | `/resultado` | image, output, observations | none |
| 29 | original | 141:3177 | P | `/inspeccion/original` | inspecting | "Imagen original" | `/inspeccion` | image (unmodified) | none |
| 30 | zoom | 141:3199 | P | `/inspeccion/zoom` | inspecting | "Ampliar" | `/inspeccion` | image | none |
| 31 | toolSheet | 141:3219 | S (host `/inspeccion`) | `/inspeccion` | inspecting | toolbar | close | Ajustar/Ampliar/Capas/Info state | none |
| 32 | abcde | 141:3252 | P | `/examen/abcde` | abcde | "Mis observaciones" or continue | `/inspeccion?tab=observaciones` | criteria values, options | none |
| 33 | abcdeB | 141:3292 | P (anchor of 32) | `/examen/abcde?criterio=b` | abcde | criterion tab B | `/examen/abcde` | same | none |
| 34 | abcdeC | 141:3331 | P (anchor of 32) | `/examen/abcde?criterio=c` | abcde | criterion tab C | `/examen/abcde` | same | none |
| 35 | abcdeD | 141:3371 | P (anchor of 32) | `/examen/abcde?criterio=d` | abcde | criterion tab D | `/examen/abcde` | same | none |
| 36 | abcdeE | 141:3413 | P (anchor of 32) | `/examen/abcde?criterio=e` | abcde | criterion tab E | `/examen/abcde` | same | none |
| 37 | calibration | 141:3455 | P | `/examen/calibracion` | abcde | INFERENCE, semantics open (O3) | `/examen/abcde` | unknown | none |
| 38 | calibrationReady | 141:3480 | P | `/examen/calibracion/lista` | abcde | INFERENCE (O3) | `/examen/calibracion` | unknown | none |
| 39 | prior | 141:3508 | P | `/examen/previo` | abcde | INFERENCE (O3) | `/examen/comparar` | prior record, if any | none |
| 40 | compare | 141:3531 | P | `/examen/comparar` | compare | "Comparar" after ABCDE | `/examen/abcde` | record, reference | none |
| 41 | notesSheet | 141:3554 | S (host `/examen/comparar`) | `/examen/comparar` | compare | note action | close | note text | none |
| 42 | summary | 141:3581 | P | `/revision` | exporting | nav "Revisión" | `/examen/comparar` | record summary, ack | none |
| 43 | export | 141:3633 | P | `/revision/exportar` | exporting | EXPORT_REQUEST | `/revision` | record, ack required | recoverExport |
| 44 | exportOptions | 141:3760 | S (host `/revision/exportar`) | `/revision/exportar` | exporting | options | close | format choices | none |
| 45 | exportDone | 141:3782 | P | `/revision/exportada` | exported | EXPORT_DONE (real download) | `/` (new record offered) | ack status, filename | none |
| 46 | guide | 141:3807 | P | `/guia` | (any, preserved) | nav "Guía" | previous route | static | none |
| 47 | privacy | 141:3841 | P | `/guia/privacidad` | (any, preserved) | link in guide | `/guia` | static, real privacy text | none |
| 48 | tone | 141:3869 | P (dev-only) | `/investigacion/tono` | (any, preserved) | dev flag | `/` | static | none |
| extra | abcdeSheet | 328:285 | component of 32 | `/examen/abcde` | abcde | n/a | n/a | n/a | n/a |
| extra | homeArt | 331:276 | component of 1 | `/` | idle | n/a | n/a | n/a | n/a |

Nav (floating glass, BRIEF): Escritorio -> `/`, Examinar -> `/imagen`, Revisión -> `/revision`, Guía -> `/guia`. Nav is hidden during `processing` and `stopWaiting` to avoid leaving a pending request silently.

## 6. Sheets vs pages

Sheets (overlay on host, Radix Dialog, spring ~240 ms from origin, interruptible; 11): scope, discard, contextDetails, siteSheet, cameraPrimer, qualityIssue, stopWaiting, modelDetails, toolSheet, notesSheet, exportOptions.

Pages (route + View Transition 220 ms, Motion fallback; 37 of the 48 views, including the 8 recovery pages and the 4 ABCDE anchor frames; the 2 extras are components, not views). ABCDE is a page (`/examen/abcde`) hosting the single accordion component, not a sheet. This is a deliberate reading of BRIEF "ABCDE = ONE accordion sheet": one component, one page, because it is a long editing surface that needs deep links, back, and scroll-to-criterion. Open item O2.

Recovery views are pages (they need a URL to survive reload and to be reachable from the PWA).

## 7. Open items for the orchestrator (not decided here)

- O1 Host rewrite: confirm the production host can serve `index.html` for unknown paths (SPA fallback). Otherwise use hash routing.
- O2 ABCDE shape conflict: BRIEF says one accordion sheet; Figma frames `141:3252`, `141:3292`, `141:3331`, `141:3371`, `141:3413` are five per-criterion full screens with an A-E segmented control, and the abcde frame shows tabs with "Sin dato" counters. Proposed resolution: one accordion component on `/examen/abcde`, with the A-E tabs as scroll anchors (`?criterio=`). The Figma per-criterion frames are treated as anchor states, not separate pages. Decision needed from Nicolas via the orchestrator if the frames must stay separate pages.
- O3 Calibration, calibrationReady and prior (`141:3455`, `141:3480`, `141:3508`) have no semantics in BRIEF and were not inspected. Mapped provisionally under the ABCDE phase. Needs a read of those frames (`get_screenshot`) before the matrix is final.
- O4 "Detener la espera" semantics: proposed as local abort that keeps the image and returns to `reviewing`. The server may still complete; the late response is discarded. Confirm this matches the BRIEF intent ("keeps the image").
- O5 Prototype affordances: the Figma consent and processing screens contain demo labels ("Abrir escenario de procesamiento", "Ver escenario de resultado ficticio", "En Figma esto solo abre un escenario"). These are NOT production copy. The production build must not have a fake-result control; mock mode is only behind `VITE_INFERENCE=mock`.
- O6 `tone` (`141:3869`) is a research/dev view; proposed dev-only route excluded from production bundle.
- O7 Consent is per image record, not per attempt: consent stays checked across retries of the same image, but SEND must be pressed explicitly each time. Confirm this is acceptable for the clinical-style flow.

## 8. Reconciled decisions (this document)

- Router: custom History API router, typed data table, no dependency (section 1). Confidence about 70%.
- Pages vs sheets: section 6.
- Recovery: 8 pages with returnTo in reducer context, no auto-retry.
- Ack invalidation: record hash only; locale excluded (G5, G6).
