# Camera capture advice (on-device)

- Origin: 2026-11-05. Revised: 2026-11-06 (motion root cause, rule set, guide chips, retraining attempt).
- Status: implemented in `src/core/capture` and `src/features/camera/guide`. Not mounted on any route yet.
- Real phone: **NOT MEASURED.** Every number below comes from Chromium headless with a fake camera fed by
  non-clinical fixtures, or from Node on a laptop CPU.
- Scope: framing, exposure, focus and motion guidance only. Not diagnosis, not image quality approval. The UI never
  says that blur was detected or that quality was approved; focus wording is hedged ("Parece borrosa, revise el enfoque").
- No clinical or patient images were used anywhere. Sources are Wikimedia Commons photographs with CC0 or
  public-domain licences (see [Sources](#sources)).

## Why the guide only said "Mantenga quieto el teléfono"

Root cause, from code and measurement:

1. **The motion signal was an absolute luma difference.** `motionBetween` took the mean absolute change of a 32 x 32
   grid of luma means. Any global brightness change counts as movement. Phone auto-exposure and white balance drift
   between frames, so a still phone looked like a moving one. The old `MOTION_ON = 6` was reached by drift alone.
2. **Hold-still outranked everything.** The old priority was `more-light, avoid-glare, hold-still, check-focus,
   center-area, closer`. A motion false positive therefore hid every other advice, which is the symptom reported.
3. **The motion threshold was not relative to sharpness.** The same luma change means more motion on a flat frame
   than on a detailed one. Hand-shake and blur were not separated.

Measured in Chromium (before, the old code, same fixtures):

| Fixture (set) | Before: share showing `hold-still` |
|---|---|
| handshake 1-4 px/frame, no exposure drift (calib / holdout / test) | 0% / 1% / 12% |
| handshake 1-4 px/frame **with** exposure drift (calib / holdout / test) | 67% / 66% / 71% |
| steady phone, exposure drift only (calib / holdout / test) | 18% / 30% / 13% |

Exposure drift is a **modelled nuisance** (per-frame gain drawn from N(1, 0.02), clipped at 3 sd). It is not measured on
a phone. The root cause in point 1 is a fact about the code: the signal reacts to any luma change. The size of the effect
on real hardware is not known. The fix (below) is independent of the nuisance model.

## What runs on the device

Frames are sampled from the guide crop (centred square, 72% of the shorter side) with
`requestVideoFrameCallback`, or `requestAnimationFrame` as a fallback. Each sample is drawn into a 128 x 128
`OffscreenCanvas`, and its RGBA buffer is transferred to a module worker. The worker keeps exactly one pending task, so a
frame that arrives while it is busy is dropped. A new analysis is due after 85 ms (`MIN_INTERVAL_TOLERANCE` of the 100 ms
nominal interval), which caps the rate at about 11.8 fps and keeps it near 10 fps under jitter. The old strict 100 ms gate measured
about 6.7 fps in headless Chromium, because late frames were skipped. The new gate measures 9.9 fps (119 analyses in 12 s).

Per frame, the pipeline computes (all in `src/core/capture`):

| Measurement | Definition | Used by |
|---|---|---|
| median luma | 256-bin median of the crop | light rules |
| specular share | largest connected region with luma >= 250, as a share of the crop | avoid-glare |
| relative grid | 32 x 32 cell means divided by the frame mean, minus 1 (gain-invariant) | motion |
| shift | mean absolute change of the relative grid since the previous frame, divided by the mean neighbour difference of the current grid (cells per frame). Null on flat frames (gradient < 0.004). | hold-still |
| focus ratio | Laplacian variance divided by luma variance. Null on flat frames (variance < 4). | check-focus |
| content | pixels deviating from the median background by more than 17% of it; trimmed span gives size and centre offset | closer, farther, center-area |

Division by the scene's own variance (focus) and by the background median (content) makes the rules invariant to
exposure gain. The worker stores only the previous relative grid (32 x 32 numbers). No pixels survive a frame.

### Rules, thresholds and dwell

Every rule is a Schmitt trigger (`src/core/capture/schmitt.ts`). It switches on after `ENTER_FRAMES = 3` consecutive
readings past the ON level, and switches off after `EXIT_FRAMES = 5` consecutive readings past the OFF level. A null
reading holds the state. Values are in `src/core/capture/constants.ts`.

| Advice | Measure | ON | OFF | Note |
|---|---|---|---|---|
| less-light | median luma | > 200 | <= 185 | overexposure |
| more-light | median luma | < 60 | >= 72 | dark |
| avoid-glare | specular share | > 0.015 | <= 0.008 | a single 1-2% spot is below the threshold on purpose |
| hold-still | shift, median of last 5 frames | > 0.55 cells | <= 0.40 | sustained, sharpness-normalised |
| closer | content size (share of crop) | < 0.38 | >= 0.44 | |
| farther | content size (share of crop) | > 0.80 | <= 0.72 | the riskiest rule, see Limits |
| center-area | content offset (share of crop) | > 0.15 | <= 0.10 | |
| check-focus | focus ratio | < 0.10 | >= 0.14 | "parece borrosa" wording |

Priority: `less-light, more-light, avoid-glare, hold-still, closer, farther, center-area, check-focus`. Light first,
because nothing else can be judged in a dark or blown-out frame. Focus last, because it is the least reliable measure.

Display (`AdvicePolicy`): a new advice needs `STABILITY_FRAMES = 2` identical consecutive candidates, and a shown advice
stays at least `MIN_DWELL_MS = 1000` before another one can replace it. One advice at a time.

### Guide chips

`GuideStatus` carries three chip states, independent of the shown advice: `focus`, `light`, `distance`. Each is `ok`
("Sin alerta"), `revisar` ("Revisar") or `sin-dato` ("Sin dato"). An icon accompanies every state, so state is not
carried by colour alone. `ok` means no alert from that measure. It never means that the image was approved.

- focus is `sin-dato` while the camera moves, when exposure is already the problem, or on a flat frame;
- distance is `sin-dato` without a content region;
- light is `revisar` for less-light, more-light or avoid-glare.

`GuideOverlay` keeps the advice sentence as the single `aria-live="polite"` region. The chips are a plain list and are not
announced on every frame. The capture button is never gated by advice.

## Evidence

### Fixtures

`scripts/camera/fetch-cc0-sources.mjs` downloads six photographs from Wikimedia Commons, checks the licence field of the
API (`CC0` or `Public domain`) and writes a manifest with sha256. `scripts/camera/make-fixture-videos.py` composes
each scenario: a smooth background from a real texture, a real photograph of an object inside a feathered disc, and
the degradation. It writes a 640 x 480, 10 fps, 12 s y4m (for Chromium) and 128 x 128 RGBA frames cropped exactly as
`guideCropRect` does (for the offline replay). Hand-shake is an integer step of `[min, max]` px per frame, kept within a
bound. The per-frame steps are measured in the video, at 640 x 480.

Three source sets, split by **scene** (a scene is one subject and one texture):

| Set | Role | Subject | Texture | Use |
|---|---|---|---|---|
| calib | threshold tuning | Tabby cat (CC0, AdinaVoicu) | Gray gravel (CC0) | diagnostics and threshold choice |
| holdout | threshold check | Coffee cup (CC0, Edward) | Sand rock (CC0, Bango Textures) | also inspected while choosing thresholds (not clean) |
| test | final score, rules frozen | Domestic cat 2019 (PD, George Chernilevsky) | Granite (CC0, Sisters.seamless) | scored once, after the rules were frozen |

Scenarios (each with an expected advice): sharp (`none`), handshake 1-4 px/frame (`none`), handshake with exposure drift
(`none`), steady with drift (`none`), blurred sigma 5 (`check-focus`), static motion blur 15 px (`check-focus`), dark
gain 0.2 (`more-light`), overexposed gain 2.4 (`less-light`), three specular spots (`avoid-glare`), small subject
(`closer`), too large subject (`farther`), off-centre subject (`center-area`), sustained 7-9 px/frame (`hold-still`).
Sweep fixtures (offline only) cover shifts of 1-12 px, blur sigma 2-4, several gains and sizes.

### Browser results (Chromium headless, fake camera fed by the y4m, real worker)

Harness: `scripts/camera/harness` (bench page), driver `scripts/camera/run-harness.mjs`, summary
`scripts/camera/summarize-runs.mjs`. "Share" = share of the analysed frames (about 119 per 12 s) whose raw candidate is the
expected advice, before stability and dwell. Full per-scenario histograms are reproducible from the same command.

| Scenario (expected) | Before: expected | Before: hold-still | After: expected | After: hold-still | After: any alert |
|---|---|---|---|---|---|
| sharp (none), test | 100% | 0% | none 100% | 0% | 0% |
| handshake 1-4 px (none), test | 88% none | 12% | none 100% | 0% | 0% |
| handshake with drift (none), test | 29% none | 71% | none 100% | 0% | 0% |
| steady, drift (none), test | 87% none | 13% | none 100% | 0% | 0% |
| sustained 7-9 px (hold-still), test | 94% | 94% | 97% | 97% | 97% |
| blurred sigma 5 (check-focus), test | 0% | 0% | 98% | 0% | 98% |
| dark (more-light), test | 0% | 0% | 98% | 0% | 98% |
| overexposed (less-light), test | 0% (shown as avoid-glare: 100%) | 0% | 98% | 0% | 98% |
| glare, 3 spots (avoid-glare), test | 100% | 0% | 98% | 0% | 98% |
| small (closer), test | 100% | 0% | 98% | 0% | 98% |
| too large (farther), test | 0% | 0% | 98% | 0% | 98% |
| off-centre (center-area), test | 100% | 0% | 98% | 0% | 98% |
| motion blur static 15 px (check-focus), test | 0% | 0% | 98% | 0% | 98% |

The same pattern holds on calib and holdout (`results/after-final`, all 39 fixtures). The full table is generated by
`summarize-runs.mjs`. The known misses:

- **calib, static motion blur 15 px:** 0 of 119 frames. Its focus ratio is 0.124, above the 0.10 ON level. The holdout and
  test copies of the same scenario are detected at 98%. This is a threshold-margin case, not a rule-logic one.
- **Mild defocus (sigma 2):** offline replay misses it on calib (`none`) and detects it on holdout (`check-focus`).
- **One-spot glare (1-2% of the crop), offset 12% of the crop, sizes near the boundary:** below the thresholds on purpose.
  They are sweep fixtures and are not in the browser table.

Per-fixture histograms (before and after) are in the summarizer output with `--histograms=1`.

### Offline replay and R2 battery

- `scripts/camera/replay-bins.mjs` runs the same modules on the 128 x 128 frames of every fixture, with the same
  stability and dwell. Re-run on 21 fixtures after the last code change, it gives the same advice pattern as the browser.
- The R2 synthetic battery (`scripts/camera/evaluate-rules.mjs`, single still frame held for ENTER_FRAMES + 1 readings):

| Category | Expected | Rules (old, 2026-11-05) | Rules (new) |
|---|---|---|---|
| sharp | none | alert 0.000 | alert 1.000 (`farther`) |
| dim-visible | none | alert 0.078 | alert 1.000 (`more-light`) |
| defocus | check-focus | alert 0.667, correct 0.656 | alert 0.989, correct 0.033 (`farther` wins) |
| motion | check-focus | alert 0.056 | alert 1.000 (`farther`) |
| dark | more-light | alert 0.956, correct 0.911 | alert 1.000, correct 1.000 |
| glare-global | avoid-glare | alert 1.000, correct 1.000 | alert 1.000 (`less-light`, not wrong for overexposure) |
| glare-local | avoid-glare | alert 1.000, correct 1.000 | alert 1.000, correct 1.000 |
| flat | check-focus | alert 1.000 | alert 0.000 (flat frames are not judged) |

The R2 battery is **not a valid test of the framing rules**. Its frames are full-frame textures with no background, so
"the content fills the crop" is the correct answer under the framing definition, and every clean frame reads as
`farther`. It was built to score focus and exposure. The reported numbers are kept for continuity, and the framing rules
are scored only on the fixtures above. The old rule set happened to be quieter on this battery because it had no
framing rule that depends on the background. The regression on this battery is a known consequence, not a hidden one.

### Timing (Node, not a phone)

`scripts/camera/bench-timing.mjs --repeats=5` on AMD Ryzen 5 5500U, Node 26.2.0, 128 px, 1200 samples:

| Path | mean | p50 | p95 | Budget at 10 fps |
|---|---|---|---|---|
| Worker handler (validation, analysis, rules) | 0.90 ms | 0.91 ms | 1.13 ms | 100 ms |

The previous measurement on this machine (earlier run, same script) gave p50 0.997 ms and p95 1.211 ms. The new path is
not slower: p50 0.91 ms and p95 1.13 ms. Run-to-run variance on this machine is about 10%. Phone timing, including the canvas
readback, is not measured.

### Bundle

`npm run build` passes. `node scripts/measure-initial.mjs`: initial JS 145.10 kB gzip (budget 170 kB). The worker, the
model JSON and the PDF generator stay outside the initial bundle.

## Blur head and the ML search

### Candidate models (Hugging Face API, no auth, 2026-11-06)

Search: `image quality`, `blur detection`, `sharpness`, `image quality assessment`, `no-reference iqa`. 46 unique
models. Shortlist, checked against licence, size and runtime:

| Model | Licence (verified) | Weight | Blocker |
|---|---|---|---|
| dwilli37/ag_image_blur_detection | Apache-2.0 | 94 MB (`.pth`, two files) | size budget 5 MB, PyTorch only |
| kilia/image-quality-mobilenetv3-large | Apache-2.0 | 17 MB fp32 (`safetensors`) | size budget 5 MB, PyTorch only, no WASM path, labels undocumented |
| matthewyuan/image-quality-fusion | MIT | 1.1 MB head + CLIP ViT-B/32 image encoder | CLIP encoder is hundreds of MB; the head needs it at runtime |
| MinhLe999/mobilenetv3-blur-detection-* | not declared | small | licence cannot be verified: excluded |
| onnx-community/swin-tiny-...-image_quality-ONNX | not declared | ~28 MB | licence not verified, size |
| opencv/face_image_quality_assessment_ediffiqa | not declared | ONNX | face-only, licence not verified |

TF Hub, Kaggle, the ONNX model zoo and MediaPipe model cards were not searched exhaustively. No model in that set was
compatible with the 5 MB, WASM and licence constraints as far as the catalogue facts allow. **No candidate was adopted and
none was benchmarked**, because none passes the hard size and runtime constraints. The acceptance gate asks for an
adopted model to beat the deterministic advisor on the benchmark, and no candidate could be run within the constraints.

### Retrained logistic head (real textures, per-scene split)

`scripts/camera/train-real-texture-head.mjs`. Six blur features (`extractBlurFeatures`) on the real-texture frames.
Positives: `check-focus` scenarios (blurred, sigma 2-4, static motion blur). Negatives: `none`, `closer`,
`center-area`, `farther` scenarios. Exposure, glare and sustained-motion scenarios are excluded because their blur
label is unclear. Split: train = calib sources, threshold = validation (holdout sources, lowest threshold with false-alert
rate <= 0.05), score = test (test sources). The R2 battery's defocus and motion frames are an extra independent holdout.

| Split | n | Recall | False-alert rate | Abstention |
|---|---|---|---|---|
| validation (holdout) | 2760 | 0.25 | 0.0004 | 0.22 |
| test (per-scene, held out) | 2760 | 0.50 | 0.00 | 0.13 |
| R2 battery (independent) | 360 | 0.00 | 0.00 | 1.00 |

Gate (fixed before training): test recall >= 0.80, test false-alert rate <= 0.05, test abstention <= 0.10, and the same
recall and false-alert on the R2 battery. **The gate failed.** The model was not written. The shipped
`camera-blur-model.json` keeps `acceptance.passed: false`, and the loader keeps the head disabled
(`acceptance-gate-not-passed`).

The deterministic focus rule does better on the same kind of frames: on the test set it flags 98% of the blurred and
static-motion-blur frames with zero false alerts on the sharp and framing scenarios. The learned head is not adopted.

## Limits

- **Synthetic and non-clinical only.** The fixtures are composed photographs with synthetic degradations: a real skin
  lesion, a real phone sensor and a real phone ISP are not represented. Exposure drift is modelled.
- **No phone was measured.** The browser numbers are Chromium headless with a fake camera. The real camera's noise, ISP
  and compression are not represented, and phone frame rates and latency are unknown.
- **Fixed downscale.** Focus and texture measures depend on the 128 px analysis edge. A phone crop is downscaled more or
  less than the fixtures, so the focus threshold may need recalibration on device.
- **Framing assumes a subject on a background.** When skin or the lesion fills the crop, there is no background and the
  framing rule reads "too large" (`farther`). This is the highest false-alert risk for dermatology close-ups. It is not
  solved here. It needs an on-device check before any clinical use, and it may need a different rule (for example, a
  tighter `farther` condition or disabling it for close-up protocols).
- **Priority.** `farther` ranks above `check-focus`. A blurred frame of a full-frame subject therefore says "move back"
  first. This is a deliberate order, but it means focus is not reported in that case.
- **Dim-visible frames** with median luma below 60 read as `more-light` (R2 battery, `dim-visible`). This is the cost of
  the median threshold.
- **Dark frames:** a frame whose luma variance is below 4 is treated as flat, so its focus is `sin-dato`. Frames that are
  dark but above that floor have focus suppressed while the light advice is active, so noise cannot raise a focus alert.
- **Motion** is shift between analysed frames. Dropped frames make the value depend on the time gap, which is not
  normalised. The median over five frames absorbs single spikes.
- Nothing is mounted: `cameraRoutes` is still a stub. Wiring is outside this lane.

## Reproduce

```
node scripts/camera/fetch-cc0-sources.mjs /tmp/camera-bench/sources
/tmp/bench-deps/venv/bin/python -I scripts/camera/make-fixture-videos.py --sources /tmp/camera-bench/sources --out /tmp/camera-bench/videos --sweep
VITE_INFERENCE=mock npx vite --port 5212 --strictPort            # in another shell
node scripts/camera/run-harness.mjs --label=after --base=http://localhost:5212 --videos=/tmp/camera-bench/videos --out=/tmp/camera-bench/results
node scripts/camera/summarize-runs.mjs --results=/tmp/camera-bench/results --before=before --after=after --histograms=1
node scripts/camera/replay-bins.mjs --dir=/tmp/camera-bench/videos
node scripts/camera/evaluate-rules.mjs                           # R2 battery, single still frame
node scripts/camera/bench-timing.mjs --repeats=5                 # per-frame cost in Node
node scripts/camera/train-real-texture-head.mjs --videos=/tmp/camera-bench/videos   # add --write only if the gate passes
npx tsc --noEmit && npm run lint && npx vitest run && npm run build && node scripts/measure-initial.mjs
```

The fixture generator needs numpy, Pillow and ffmpeg, installed in an isolated environment (for example
`/tmp/bench-deps/venv`). Nothing is installed into the project `node_modules`.

The legacy scripts `scripts/bench/run-battery.mjs` and `scripts/bench/baseline-classifier.mjs` are the reference
baseline. They are unchanged.

## Next steps

1. Measure on a real phone (Android and iOS): frame rate, p95 frame cost, real false-alert rates on non-patient frames,
   and the framing behaviour on close-ups. Only then decide on `farther` and on the focus threshold.
2. Add a relative focus check at the crop resolution a phone produces, and recalibrate the focus threshold there.
3. Retrain the head only with a new held-out set that is not used for threshold choice, and only if it can pass the gate.

## Sources

Licences were read from the Wikimedia Commons API (`extmetadata.LicenseShortName`) and the files were hashed when
downloaded. The manifest is written by `scripts/camera/fetch-cc0-sources.mjs` to `manifest.json` in the source folder.

| id | set | licence | author | sha256 (first 16) |
|---|---|---|---|---|
| cat | calib | CC0 | AdinaVoicu | 3e46fb5858d3f67e |
| gravel | calib | CC0 | Photos Public Domain authors | 544275233b226839 |
| coffee | holdout | CC0 | Edward | a964c8a4c35894ca |
| sand | holdout | CC0 | Bango Textures | bc5d1bab7284bc87 |
| cat2 | test | Public domain | George Chernilevsky | f0f041eda81d506b |
| granite | test | CC0 | Sisters.seamless | 728201a5e84a6002 |

No patient or clinical image was downloaded or used.
