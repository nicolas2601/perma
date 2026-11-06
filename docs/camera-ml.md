# Camera capture advice (on-device)

- Origin date: 2026-11-05
- Status: implemented in `src/core/capture` and `src/features/camera/guide`. Not mounted on any route yet.
- Real phone: **NOT MEASURED.** All evidence below is synthetic and runs in Node on a laptop CPU.
- Scope: framing and exposure advice only. Not diagnosis, not image quality approval. The UI never says that blur was detected or that quality was approved.

## What runs on the device

Frames are sampled from the guide crop (centred square, 72% of the shorter side) at `TARGET_FPS = 10` with `requestVideoFrameCallback`, or `requestAnimationFrame` as a fallback. Each sample is drawn into a 128 x 128 `OffscreenCanvas` and its RGBA buffer is transferred to a module worker.

The worker keeps exactly one pending task. A frame that arrives while the worker is busy is dropped, not queued. Each reply is validated at the boundary. A reply with a stale id is ignored.

If the pending task passes `DEADLINE_MS = 1500` without a reply, the worker is terminated and advice degrades to manual, once. Three consecutive invalid-frame failures degrade the same way. The capture button is never gated by advice.

Per frame, the worker measures:
- dark share (luma < 10), and global glare share (luma > 245), with a 0.9 trigger and 0.8 release (hysteresis);
- local specular glare: the largest connected region with luma >= 250, on 3% on and 1.5% off;
- low detail: Laplacian variance, 8 on and 12 off;
- inter-frame motion: mean absolute change of a 32 x 32 luma grid, 6 on and 3 off;
- framing: trimmed span of pixels that differ from the median background by at least 25 levels. Size below 0.35 gives `closer`, and centre offset above 0.2 gives `center-area`. This is a heuristic, not a lesion detector.
- blur head (optional, currently disabled): six multi-scale log energies, z-score, logistic regression, training-range abstention. It runs only when exposure and motion do not already decide.

Priority: `more-light`, `avoid-glare`, `hold-still`, `check-focus`, `center-area`, `closer`, `none`. One advice is active at a time. A new advice replaces the active one only after two identical consecutive candidates.

No frame leaves the device or is stored. The worker keeps only the 32 x 32 motion grid between frames. A test spies on `fetch`, XHR, `sendBeacon`, `Storage` and makes 40 advising cycles with zero calls.

## Blur head: acceptance gate, not passed, disabled

`scripts/camera/train.mjs` trains the head on a procedural set. The generator is `procedural-value-noise-v1`: fractal value noise, soft elliptical blobs and an illumination gradient. This family differs from the R2 battery (sinusoids and gaussian blobs).

- 720 scenes, seed 51713, 4 frames per scene (sharp, dim, gaussian sigma 1 to 3, motion 5 to 13 px), 2,880 frames.
- Scene-level split 60/20/20: 432 / 144 / 144 scenes (1,728 / 576 / 576 frames). No scene appears in two splits.
- Threshold chosen on validation only: lowest value with validation false-alert rate <= 0.05 (result 0.15).
- Gate, fixed before training: test recall >= 0.80, test false-alert rate <= 0.05, test abstention <= 0.10, and the same two numbers on the R2 battery as an independent holdout.

Results (one run, reproducible, two identical runs compared byte for byte):

| Metric | Value | Gate |
|---|---|---|
| Validation recall / false alert | 1.000 / 0.045 | (threshold source) |
| Test recall | 0.993 | >= 0.80 pass |
| Test false-alert rate | 0.059 | <= 0.05 **fail** |
| Test abstention | 0.000 | <= 0.10 pass |
| R2 battery recall (defocus + motion) | 0.061, abstention 0.956 | >= 0.80 **fail** |
| R2 battery false alert (sharp + dim) | 0.000, abstention counted as silence | <= 0.05 pass, but not evidence |
| Battery frames actually judged | 16 of 360 | too few to conclude |

The battery is out of the training range, so the head abstains on 96% of it. Its zero false-alert figure reflects silence, not discrimination. The old reference head (`scripts/bench/baseline-model.json`) on this procedural test gives recall 0.510 and false-alert rate 1.000, with 24% abstention. The false-alert problem reproduces on a second generator.

Decision: the gate failed. The shipped model records `acceptance.passed: false`. The loader re-checks the gate and disables the head with reason `acceptance-gate-not-passed`. Nothing was re-tuned after seeing the battery result.

## Rules-only numbers (blur head off)

Single-frame R2 battery, 720 frames, 128 px, `scripts/camera/evaluate-rules.mjs`:

| Category | Expected | Alert rate | Correct advice |
|---|---|---|---|
| sharp | none | 0.000 | 1.000 |
| dim-visible | none | 0.078 | 0.922 |
| defocus | check-focus | 0.667 | 0.656 |
| motion | check-focus | 0.056 | 0.033 |
| dark | more-light | 0.956 | 0.911 |
| glare-global | avoid-glare | 1.000 | 1.000 |
| glare-local | avoid-glare | 1.000 | 1.000 |
| flat | check-focus | 1.000 | 1.000 |

Overall: sensitivity on positives 0.780 (baseline arm in R2: 0.985 with false alerts 0.650; pure CV without blur head: 0.607). False-alert rate on clean frames 0.039 (7 of 180). All 7 are `center-area` on dim-visible frames.

Motion cannot be scored on a single-frame battery. It is checked only by fixtures (a 12 px shift triggers `hold-still`).

## Timing (Node, not a phone)

`scripts/camera/bench-timing.mjs`, 128 px, 240 frames x 5 repeats = 1,200 samples. Machine: AMD Ryzen 5 5500U, Node v26.2.0. CPU throttling was **not** applied.

| Path | mean | p50 | p95 | Per-frame budget at 10 fps |
|---|---|---|---|---|
| Worker handler (validation + analysis + rules) | 0.99 ms | 0.997 ms | 1.211 ms | 100 ms |
| Measurement + rules only | 0.96 ms | 0.972 ms | 1.163 ms | 100 ms |

The "analysis FPS ceiling" in the JSON (about 1,000) is 1000 / mean on this laptop. It is not an expectation for a phone. Phone numbers, including the canvas readback (`getImageData`) cost, are not measured.

The R2 baseline (blur head included) was 0.39 ms p50 at 128 px in its own measurement. The new path also computes motion, specular and framing, which explains the rise to about 1 ms.

## Model loading and validation

`src/core/capture/model/camera-blur-model.json` is imported on demand as raw text (`import(... ?raw)`), so it ships as a separate chunk. Build check: the worker and the model each produced their own chunk, and the initial bundle is unchanged (220.9 kB raw, 69.2 kB gzip, budget 170 kB gzip).

Validation covers version, scope `synthetic-blur-only`, feature count, finite vectors of length 6, positive scale, `min <= max`, threshold in (0, 1), and the acceptance block. Any failure yields a disabled head with a typed reason. Parity: the unit test checks the predictor against a naive logistic evaluation (12 decimals). The training report shows the same check on the full test split, with a maximum gap of 2.2e-16.

## Limits

- Evidence is synthetic only: procedural trainer, in-house battery. Both come from the same team, so the battery is a holdout in the data sense, not an independent evaluation.
- The blur head is off. Blur and motion advice rest on rules and fixtures, not on measured recall.
- Dim frames produce `center-area` (7.8%). The framing threshold uses absolute contrast, and dimming reduces it. A relative threshold is the likely fix. It was not tuned against the battery.
- `closer` and `center-area` are heuristics. On real skin close-ups with a plain background they may fire wrongly. Expect more sensitivity and more false alerts on a phone than the synthetic numbers show.
- Smooth or defocused skin triggers `check-focus` by design (low detail).
- Motion is computed between analyzed frames, not per second. Dropped frames make the motion value depend on the time gap. It is not normalized.
- Nothing is mounted: `cameraRoutes` is still a stub. Wiring is outside this lane.
- The reference branch `feature/camera-ml-motion` could not be read from this worktree (the worktree git guard blocks `git -C` into another repository). The design follows `docs/BRIEF.md`, `docs/adr/R2-camera-ml.md` and the shipped bench baseline, not the reference source line by line.

## Reproduce

```
node scripts/bench/run-battery.mjs --timing-repeats=5   # R2 baseline arm (unchanged)
node scripts/camera/evaluate-rules.mjs                  # new rules on the battery
node scripts/camera/bench-timing.mjs --repeats=5        # per-frame cost in Node
node scripts/camera/train.mjs --write                   # train, gate, write model JSON
npm test && npm run lint && npm run typecheck
```

`train.mjs` without `--write` prints the report and writes nothing.

## Next steps

1. Relative framing threshold, then re-measure dim-visible false alerts on the battery and on a new holdout.
2. Real-device measurement in the PWA (Android and iOS): sampling cadence, p95 frame cost, and real false-alert rates on non-patient frames. Only then consider enabling the head.
3. Retrain only with a new held-out set that is not used for threshold choice.
