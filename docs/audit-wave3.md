# Wave 3 audit summary (2026-11-06)

Independent read-only reviews run against `develop`, then fixed by the lead. Raw artifacts (scripts, JSON) live in `audit/`; screenshots and traces are git-ignored.

## Scope and method
- Accessibility: axe (wcag2a/aa/22aa) on 48 views x 390 and 320 px, keyboard walk on 14 screens, Escape/focus return, reduced motion, emulated 200% zoom. Playwright CLI, Chromium headless. No screen reader run.
- Visual: 48 Figma screenshots opened side by side with the PWA at 390x844 @2x, plus 768/1280/1440 sanity captures. Objective checklist, no "looks fine" verdicts.
- E2E: 23 specs x 2 viewports: 9-step journey, 8 recovery scenarios provoked for real, stop-waiting, IndexedDB persistence, production service worker offline shell, camera privacy (no network or storage writes from the guide), MSW absence, real JSON and PDF downloads.
- Performance: Lighthouse mobile (3 runs, median), bundle graph, service worker precache, camera advisor fps.
- Security/privacy: code trace, EXIF/GPS test with an in-memory JPEG, CSP replay, `npm audit`, licences.

## Findings fixed in this wave
| Area | Finding | Fix |
|---|---|---|
| Privacy | Discard kept body site and prior image id | `discardRecord` resets them |
| Privacy | Uploaded file name travelled in exports | fixed neutral label |
| Privacy | Copy claimed nothing from the camera is stored | copy now separates guide frames (never stored) from the photo taken (kept on device, uploaded only on Send) |
| Upload | Type validated only by MIME | magic-byte sniffing (JPEG/PNG/WebP) |
| Privacy | PNG/WebP were not persisted (GPS could not be verified clean) | metadata stripped (JPEG APP1, PNG eXIf/text, WebP EXIF/XMP) so they persist |
| Persistence | Model result lost on reload; stage screens redirected | result persisted (raw scores, source label); autosave flushes on pagehide, result saved at once |
| A11y | `html[lang]` never changed | set from the active locale |
| A11y | Scrollable regions not focusable | `tabIndex=0` |
| A11y | 20 px export checkbox | 24 px |
| A11y/PWA | Offline-ready banner covered the primary CTA | moved to top, auto-dismiss, plus a persistent offline status notice |
| Perf | Initial JS 170.75 kB gzip (over budget), size-limit measured only the entry | 144.9 kB; real graph measured by `scripts/measure-initial.mjs`; Motion features lazy, zod removed from first paint, Home bundled with the entry |
| Perf | Service worker precached lazy heavy chunks and non-latin fonts | pdf-lib chunk and sample images excluded; only Geist latin precached and preloaded |
| Motion | `AbortError: Transition was skipped` on fast navigation | rejections swallowed |
| Visual | Discard had no confirmation; Home art/nav sizes; raw `face` in summary; viewer tools entry and sheet; calibration/prior/D-E reference cards; guide CTA | fixed against Figma nodes |

## Open items (honest)
- LCP: lab median 2.60 s on `/` (budget 2.5 s), 3.09 s on a direct `/imagen` load (redirect plus lazy chunk). CLS 0, TBT 0. INP not measured.
- Real-phone hardware, screen readers and real browser zoom were not tested.
- The mock inference client still ships (inert) inside the production bundle; MSW does not.
- The stored image stays in the browser (IndexedDB) until the exam is discarded; the privacy copy says so.
- Figma differences kept on purpose: ABCDE is one accordion sheet (brief decision), export is JSON/PDF (Figma shows TXT), prototype-only labels excluded, `contextDetails` five selects and `siteSheet` option list skipped (no data model for them).
- `base` and `tta` returned identical scores for one image on B71; the UI does not present them as different. Backend question for Pau.
- Camera blur classifier is OFF: its acceptance gate failed (false alerts 5.9% vs 5% limit); the shipped advisor uses deterministic rules (sensitivity 0.78, false alerts 3.9% on the synthetic battery). Evidence is synthetic only.
