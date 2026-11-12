# Inference API notes

Source of truth for the shapes below: the captured bodies in `fixtures/api/*.json`. Captured on 2026-11-05 against `https://derm.nicolasmoreno.site` (release `v9.0.0`, device `cpu`, 2 threads). The API is shared research infrastructure: discovery used a fixed budget (2 predict calls, 3 invalid probes, 1 status, 1 report) and nothing was looped.

## Discovery budget used

| Call | Result | HTTP | Latency (single sample) | Fixture |
| --- | --- | --- | --- | --- |
| `GET /api/status` | ready, B71 | 200 | 0.77 s | `status.json` |
| `GET /api/report` | ready, A71 and B71 | 200 | 1.26 s | `report.json` |
| `POST /api/predict?model=B71&mode=base` | `pred: nv` | 200 | 10.14 s | `predict-B71-base.json` |
| `POST /api/predict?model=B71&mode=tta` | `pred: nv` | 200 | 3.48 s | `predict-B71-tta.json` |
| Probe: empty file (`image/webp`, 0 bytes) | `INVALID_IMAGE` | 400 | 0.40 s | `probe-empty-file.json` |
| Probe: `text/plain` body | `UNSUPPORTED_MEDIA_TYPE` | 415 | 0.36 s | `probe-wrong-type.json` |
| Probe: no `file` field | FastAPI validation | 422 | 0.48 s | `probe-no-file.json` |

Input image: `src/assets/images/reference-tschandl-600.webp` (public reference, P. Tschandl, CC BY-SA 4.0). The brief allowed the repo webp, so no Figma download was needed. The API accepted it as `image/webp`.

Latency is one sample per call and includes cold-start effects (the base call is the first inference after the status call). Do not treat these numbers as a benchmark.

## Observed response shapes

### `GET /api/status`
`backbone_ready`, `classification_ready`, `reason`, `release`, `release_arm`, `device`, `threads`, `identity {model_id, release, arm, model_sha256, sha256_verified, recipe}`, `recipe`, `model_key`.

### `GET /api/report`
`source {release, scope}`, `disclaimer`, `model` (state without `model_key`), `models {A71, B71}`. It no longer carries the scientific report; it returns state and a disclaimer only.

### `POST /api/predict` (200)
`pred`, `confidence`, `classes` (order `akiec, bcc, bkl, df, mel, nv, vasc`), `probs` (per class), `feature_dim` (3072), `mode`, `requested_mode`, `inference_mode` (`D4`), `views` (8), `model_key`, `identity`.

Mapped to `InferenceResult` in `src/core/inference/contract.ts`. Validation rejects a missing or extra-ranged class, a `confidence` that does not equal `probs[pred]`, a class order change, a non-hex sha256, and a `model_key` other than the one requested. Each rejection is `InferenceError('invalid-response')`.

### Error bodies
Two shapes exist, and both are tolerated:
- Custom: `{"error": {"code": "...", "message": "..."}}` (400, 415).
- FastAPI: `{"detail": [ ... ]}` (422).

### Headers
`content-type: application/json`, `x-content-type-options: nosniff`, `x-frame-options: DENY`.

## Findings

1. **`base` and `tta` gave identical scores for B71 on this image.** Both report `inference_mode: D4` and `views: 8`, and the `probs` are byte-identical. This is one image only (n=1), so it is an observation, not a conclusion. It suggests that for B71 the `base` path already runs the D4 TTA ensemble. The UI must not present `tta` as a different result without evidence. Open question for the backend.
2. **The API labels `probs` as probabilities.** The app treats them as raw experimental scores, per `InferenceResult.scores` and the BRIEF ("not probabilities, not a diagnosis"). The UI copy must keep that wording.
3. **Model identity is present and verified by the server** (`sha256_verified: true`) for both arms. The app still shows the identity as reported and does not invent a trace to the thesis repo.
4. **A71 and B71 use different recipes** (`cls_attn`, tau 0.5 for A71; `cls4`, tau 0 for B71). The identity is per arm; the client never assumes one recipe.

## Client decisions

- HTTP to scenario mapping (`src/core/inference/transport.ts`):
  - 429 is `rate-limit`.
  - 401 and 403 are `permission`.
  - 5xx is `server-error`.
  - 400, 413, 415, 422 are `file-unavailable` (the file was rejected).
  - Client-enforced timeout (60 s, covers body read too) is `timeout`.
  - `navigator.onLine === false`, or a `TypeError` from `fetch`, is `offline`.
  - A caller abort is rethrown untouched. It is cancellation, not an error state.
- `status` throws `server-error` when `classification_ready` or `backbone_ready` is false. A not-ready model is not presented as healthy.
- No retries. `useInferenceStatus` sets `retry: false`, so a 429 is not repeated against the shared API.
- `export-unavailable` has no HTTP origin (export is client-side). It is mock-only by design.

## Pending backend items

1. **Default model (resolved).** A71 and B71 were retired upstream on 2026-11-08 and the client now serves only `MOCO_HAM7` (see `docs/model-swap.md`). The B71/A71 captures below are kept as history.
2. **`model_sha256` is not traceable from the thesis repo.** The API reports a hash and `sha256_verified: true`, but the thesis repo does not contain the matching artifact, so the chain of custody cannot be checked from our side.
3. **`/api/report` no longer returns the scientific report.** The client does not depend on it; it is kept only for contract validation.

## Test coverage gaps (synthetic, not captured)

Only the 400 body is a real capture. The following failure bodies are synthetic in `src/mocks/msw/scenarios.ts`, because the discovery budget did not allow provoking them live: 429, 503, 403, transport failure, and the non-JSON 200. Re-capture only if the budget is renewed and Pau agrees.
