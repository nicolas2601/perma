# ADR R2: On-device camera capture advice runtime

- Status: Proposed (research recommendation, no production change). Revised 2026-11-06: the deterministic rule runtime is implemented (see the revision at the end). The decisions 1-4 below still hold for heavy runtimes and the blur head.
- Date: 2026-11-05
- Lane: R2 camera-ML (Research squad)
- Scope: capture advice only (dark, glare, low detail/blur, motion, framing). Not diagnosis, not image quality approval.

## Context

PERMA needs live advice while the clinician frames a skin image: "acerque un poco", "más luz", "evite el reflejo", "mantenga quieto", "centre la zona", "revise el enfoque". The brief (`docs/BRIEF.md`, section Camera ML) asks to port the architecture of `feature/camera-ml-motion` in `~/Documentos/skin-model-pwa`, to run at roughly 8-12 fps in a worker, and to keep the capture path independent of advice. Heavier runtimes (MediaPipe Tasks Vision, ONNX Runtime Web) were proposed as candidates. This ADR compares them against the baseline with a deterministic synthetic battery.

Reference baseline (read-only, `git cat-file`, branch tip `7a0980dd`):

- `cameraQuality.ts` `assessPreview`: deterministic rules. Dark if more than 90% of pixels have luma < 10. Glare if more than 90% have luma > 245 (global only). Low detail if the Laplacian variance is < 8.
- `cameraBlurFeatures.ts` `extractBlurFeatures`: six multi-scale log energy features.
- `cameraBlurModel.ts` `createBlurPredictor`: logistic regression with z-score normalisation, training-range abstention, threshold 0.5.
- `camera-blur-model.json`: 4,523 bytes, 6 weights, scope `synthetic-blur-only`. Its own evidence reports a test false-warning rate of 0.029 and blur recall of 0.899 on its own synthetic generator.

## Decision drivers

1. Measured sensitivity and false alerts on frames the model did not train on.
2. Per-frame time at the target cadence (8-12 fps means under about 80-120 ms per frame budget, far above the baseline cost).
3. Bundle and startup weight against the budget (initial JS <= 170 KB gzip; heavy runtimes must load on demand).
4. Licence and device requirements (WASM, WebGPU/WebGL).
5. Honesty: no real patient images, synthetic-only evidence, no claims beyond what was run.

## Options

- A. Baseline: pure-CV rules plus the tiny blur logistic regression (reference architecture).
- B. Pure-CV only: the deterministic rules without the blur head.
- C. `@mediapipe/tasks-vision@1.2.2` (Apache-2.0). Requires a generic pretrained model, not chosen or downloaded here.
- D. `onnxruntime-web@1.31.1` (MIT) with a generic pretrained model, not chosen or downloaded here.

Options C and D were not evaluated for accuracy. No model was downloaded and no inference was run, so only the bundle and documentation facts below are available for them.

## Measured results (synthetic battery, A and B)

Battery: `scripts/bench/synthetic-battery.mjs`, seed `20261105`, 128 x 128 RGBA, 8 categories x 30 scenes x 3 severity levels = 720 frames. Positives (need advice) = 540; negatives (should stay silent) = 180 (sharp 90, dim-visible 90).

Definitions: sensitivity = positives with any non-center advice / positives. False alert = negatives with any non-center advice / negatives. Correct advice = output equals the expected category advice. Abstention = frames where the blur head returned "outside training range" (advice then falls to rules or center).

| Metric | A baseline | B pure-CV |
|---|---|---|
| Sensitivity (any alert, positives) | 0.985 | 0.607 |
| Correct advice on positives | 0.807 | 0.600 |
| False alert rate on negatives | 0.650 | 0.000 |
| Abstention on positives / negatives | 0.011 / 0.000 | 0 / 0 |

Per category (alert rate / correct advice rate):

| Category | Expected | A baseline | B pure-CV |
|---|---|---|---|
| sharp | center | 0.633 / 0.367 | 0.000 / 1.000 |
| dim-visible | center | 0.667 / 0.333 | 0.000 / 1.000 |
| defocus | detail | 0.956 / 0.956 | 0.656 / 0.656 |
| motion | detail | 0.978 / 0.978 | 0.033 / 0.033 |
| dark | dark | 0.978 / 0.911 | 0.956 / 0.911 |
| glare-global | glare | 1.000 / 1.000 | 1.000 / 1.000 |
| glare-local | glare | 1.000 / 0.000 | 0.000 / 0.000 |
| flat | detail | 1.000 / 1.000 | 1.000 / 1.000 |

Per-frame time, Node 26.2.0 on AMD Ryzen 5 5500U (12 threads, 9.6 GiB), 240 frames x 5 repeats = 1,200 samples per cell. Run-to-run variance between two runs was about 10% (for example A at 128 px p50 0.42 ms in one run, 0.39 ms in another):

| Edge | A baseline p50 / p95 (ms) | B pure-CV p50 / p95 (ms) |
|---|---|---|
| 128 px | 0.39 / 0.46 | 0.18 / 0.24 |
| 256 px | 1.56 / 1.87 | 0.70 / 0.95 |

Model weight (A): 4,523 bytes raw JSON, 2,201 bytes gzip, 6 weights plus bias and 6-element normalisation vectors. Port source `scripts/bench/baseline-classifier.mjs` is 134 lines.

Parity: the JS port was checked against the reference TypeScript modules in a scratch directory (`/tmp/r2-parity`, not committed because the reference source is not in this repo). Over the same 720 frames: max absolute feature difference 5.4e-12, 0 `assessPreview` mismatches, 0 predictor mismatches. The first port run had 18 `assessPreview` mismatches caused by counting dark and glare on Float32-stored luma. That was fixed by counting on float64 values, as the reference does.

Noise check (scratch, `/tmp/r2-parity/noise-check.mjs`): adding uniform sensor-like noise to sharp frames (amplitude 0, 2, 6, 12) gave sharp false-alert rates of 0.633, 0.633, 0.567, 0.411. Noise therefore does not explain the false alerts. The cause is not established. The most likely explanation is distribution shift between the reference generator and this battery, but that is an inference, not measured.

## Not measured (documentation and registry facts only)

| Item | `@mediapipe/tasks-vision@1.2.2` | `onnxruntime-web@1.31.1` |
|---|---|---|
| npm `dist.unpackedSize` | 31,269,184 bytes (12 files) | 150,622,959 bytes (511 files) |
| Dependencies | none listed | long, platform, protobufjs, flatbuffers, guid-typescript, onnxruntime-common |
| Licence (npm field) | Apache-2.0 | MIT |
| Browser requirements | WASM fileset loaded via `FilesetResolver.forVisionTasks`. Delegate `CPU` (XNNPACK in WASM build) or `GPU` (WebGL2 via OffscreenCanvas, worker path) | WASM default (`ort-wasm-simd-threaded.wasm`). WebGPU needs `onnxruntime-web/webgpu` and a `.jsep.wasm` build |
| Startup cost | not in docs, not measured | not in docs, not measured |
| Model weight | not chosen, not measured | not chosen, not measured |

`unpackedSize` counts every file in the package, including all wasm and bundle variants. It is not the byte count a page would download. Per-file transfer sizes and startup time need a real build and were not measured.

Sources: MediaPipe web vision README and `task_runner_options.d.ts` (`https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/tasks/web/vision/README.md`, Context7 `/google-ai-edge/mediapipe`); MediaPipe graph runner and XNNPACK default in the calculator source (same repo); ONNX Runtime web docs (`https://onnxruntime.ai/docs/tutorials/web/env-flags-and-session-options.html`, `https://onnxruntime.ai/docs/execution-providers/WebGPU-ExecutionProvider.html`, `https://onnxruntime.ai/docs/api/js/interfaces/Env.WasmFilePaths.html`, Context7 `/websites/onnxruntime_ai`); npm registry (`npm view <pkg>@<ver> dist.unpackedSize dist.fileCount license dependencies`).

## Decision

1. Keep the tiny classifier path (option A architecture) as the default. Do not adopt MediaPipe or ONNX Runtime now. Nothing measured shows a heavier runtime wins. Their accuracy was not measured, so this is a decision on missing evidence, not on a demonstrated loss.
2. Treat the blur head as not ready to be on by default. The 0.65 false-alert rate on clean frames (sharp 0.63, dim 0.67) contradicts the reference's own 0.03-0.09 figures. Until a second independent evaluation supports it, advice must not claim blur detection, and the blur head should stay behind a feature flag or be used only for the `detail` advice with hysteresis (two identical results), as the brief already specifies.
3. Keep the deterministic rules always on. They are cheap (0.18 ms at 128 px), have zero false alerts on this battery, and cover dark and global glare well. Add a local-glare rule (fraction of saturated pixels in a connected region), because both arms miss glare-local completely (0.000 recall).
4. If a heavy runtime is later needed for a measured gain, load it on demand after the first capture-screen interaction, never in the initial bundle (budget 170 KB gzip). Measure startup (WASM fetch, model fetch, session creation) on a real device before adopting it. Candidates: MediaPipe `ImageClassifier` or ONNX Runtime with a generic model, only with a verified model licence.

## Consequences

- Positive: no new runtime, no added bundle weight, no model licence to verify. Advice stays deterministic and testable.
- Negative: blur and motion advice depend on a head that over-warns on this battery. Motion advice is not measured at all: the battery is single-frame, so inter-frame motion ("mantenga quieto") is not tested and the baseline has no inter-frame signal.
- Limits: the battery is synthetic and in-house. Its generator family (sinusoids and gaussian blobs) overlaps conceptually with the reference training generator, so it is not fully independent. No real phone, skin, or lesion image was used, and none was downloaded. Timing is from a laptop CPU in Node, not a phone or browser. Option C and D accuracy was not evaluated.

## Pre-mortem

- The blur head ships on by default, and real phone frames trigger constant "revise el enfoque" alerts. Mitigation: keep it behind a flag until a second evaluation passes, and gate on the 0.65 false-alert figure.
- A heavy runtime is adopted on a benchmark with a non-commercial model. Mitigation: verify the model licence before any download.
- Timing measured in Node is taken as browser performance. Mitigation: measure in the PWA on a real Android device before any cadence decision.

## Reproduce

```
node scripts/bench/run-battery.mjs            # JSON report to stdout, no network, no files written
node scripts/bench/run-battery.mjs --timing-repeats=5
npm view @mediapipe/tasks-vision@1.2.2 dist.unpackedSize license dependencies
npm view onnxruntime-web@1.31.1 dist.unpackedSize license dependencies
```

The bench reads `scripts/bench/baseline-model.json`, a byte-identical copy of the reference model (git blob `4c1d1402`, sha256 prefix `5816530c`).

## Revision 2026-11-06: rule runtime, motion root cause, head stays off

Context: the first iPhone trial showed only "Mantenga quieto el teléfono". The motion signal was an absolute luma
difference, so auto-exposure drift read as movement, and hold-still outranked every other advice. Evidence and numbers:
`docs/camera-ml.md`.

Decisions:

1. **Motion is sharpness-normalised and gain-invariant.** The relative grid (cell means divided by the frame mean, minus
   one) removes uniform exposure changes. The shift is divided by the frame's own neighbour gradient, in cells per frame.
   Hold-still needs a median of five frames above 0.55 cells. Browser check on fixtures: hand-shake of 1-4 px per frame
   gives 0% hold-still (before, with drift: 67-71%).
2. **Priority: light, glare, sustained motion, framing (closer, farther, centre), focus.** Each rule is a Schmitt trigger
   with enter and exit thresholds and a dwell. A shown advice keeps at least 1 s.
3. **Chips carry the status of each measure** (focus, light, distance), with `ok`, `revisar` or `sin-dato`. Focus is not
   judged while the camera moves or when exposure is the problem. The advice sentence stays the only live region.
4. **The blur head stays disabled.** The retrained head on real-texture fixtures (per-scene split) fails the gate: test
   recall 0.50 (gate 0.80), R2 battery recall 0.00. The shipped model JSON keeps `acceptance.passed: false`.
5. **No heavier runtime is adopted.** The Hugging Face search found no model that is at most 5 MB, permissively licensed
   and runnable in WASM. The shortlisted candidates are 17 MB, 94 MB, or depend on a CLIP encoder of hundreds of MB.

Consequences:

- Positive: the deterministic runtime covers six advices and the chips, with a measured false-alert rate of 0% on the
  sharp, steady and hand-shake fixtures, and 98% expected-advice share on positives (browser, three source sets).
- Negative: the R2 battery is not a valid framing benchmark (full-frame textures). `farther` fires on clean frames of
  that battery. The framing rule assumes a subject on a background, so close-up skin may read as "too large". This is the
  main risk for clinical use and is open until an on-device check.
- Negative: nothing was measured on a phone.
