# PERMA design contract

Source of truth: Figma file `L2ld6aykwGET520sEfskjg` (read-only). Flow page `141:2245` (48 views, see `docs/figma-manifest.json`), system `268:6`, motion `200:4`, reflow QA `278:6`.

Style: clinical enterprise, bento, image first, Geist. Experimental research prototype: scores are raw, not probabilities; the app does not diagnose.

## Tokens (see `src/styles/tokens.css`)
canvas #f2f5f4, surface #ffffff, ink #1f2b2a, muted #566963, line #7d9692, soft-line #d4dfdb, subtle #e8eeec, accent #006779, on-accent #ffffff, error #a52a37 (confirm in 268:6).
Type: page 28/34 SemiBold, section 20/26, body 16/24, label 14/20 Medium, header 13/18 Medium, caption 12/16. Base spacing 4 px. Focus: 2 px outline, 2 px offset. Touch targets >= 44 px.

## Rules
- Original image is never filtered or overlaid; no fabricated mask or heatmap.
- No risk bars, traffic-light colors, animated score counters or fake waits.
- Persistent notice: "Prototipo experimental de investigación. Los puntajes no son probabilidades clínicas. No diagnostica."
- ES/EN switch keeps the record; only fixed presentation text changes.
- Motion: transform and opacity only, press scale(0.97) 120-160 ms, sheets spring bounce 0, reduced motion = 100 ms crossfade.
