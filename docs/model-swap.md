# Model swap runbook

How to point the app at a new inference model (new arm, new release, or a different default). Assumes the backend already serves the new arm; the client cannot make a server arm exist.

## 0. Decide what changes

| Change | Steps |
| --- | --- |
| Default arm only (for example B71 to A71) | Section 4 only. No code change. |
| New arm id (for example `C81`) | Sections 1, 2, 3, 4, 5, 6. |
| Same arm, new release or new weights | Sections 2, 3 (identity literals only), 4, 5. |

## 1. Backend prerequisite (outside this repo)

- `GET /api/status` must report the new arm under `identity.arm`, `release_arm` and `model_key`.
- `POST /api/predict?model=<ID>&mode=base|tta` must accept the new id.
- Confirm the arm is `classification_ready` and `backbone_ready` before going further. The client throws `server-error` for a not-ready model.

## 2. Re-capture the fixtures (budget: 2 predict calls, 1 status, 1 report)

Use the public reference image only: `src/assets/images/reference-tschandl-600.webp`.

```sh
BASE=https://derm.nicolasmoreno.site
IMG=src/assets/images/reference-tschandl-600.webp
curl -sS "$BASE/api/status"  -o fixtures/api/status.json
curl -sS "$BASE/api/report"  -o fixtures/api/report.json
curl -sS -X POST -F "file=@$IMG;type=image/webp" \
  "$BASE/api/predict?model=<ID>&mode=base" -o fixtures/api/predict-<ID>-base.json
curl -sS -X POST -F "file=@$IMG;type=image/webp" \
  "$BASE/api/predict?model=<ID>&mode=tta"  -o fixtures/api/predict-<ID>-tta.json
```

Do not re-capture the probe fixtures unless the error contract changed. Record the new calls and their latencies in `docs/api-notes.md`.

The test fixture loader (`src/mocks/msw/fixtures.ts`) imports these exact file names. Renaming a file means updating that loader and `src/mocks/msw/handlers.ts` (`predictBase` / `predictTta` keys).

## 3. Update the type surface

1. `src/core/inference/types.ts`: add the id to the `ModelId` union.
2. `src/core/inference/contract.ts`: add the id to `LIVE_MODEL_KEYS`. The `arm` and `model_key` enums derive from it.
3. `src/core/inference/factory.ts`: add the id to `MODEL_IDS`, so `VITE_DEFAULT_MODEL` accepts it.
4. If the new arm is not served live (mock-only), keep it out of `LIVE_MODEL_KEYS` and the live client rejects it with `RangeError`.

## 4. Point the default at the new arm

- Local: set `VITE_DEFAULT_MODEL=<ID>` in `.env` (not committed; `.env` is git-ignored). `.env.example` documents the variable.
- CI and hosting: set the same variable in the build environment. Never hardcode it in source.
- The default is currently `B71`, pending Pau's decision on B71 vs A71 (see `docs/api-notes.md`).

## 5. Update the identity literals in tests

These tests pin the captured identity. Change them to the new fixture values, do not loosen the assertions:

- `tests/unit/inference/contract.test.ts`: the `normalizes the base fixture` expectation (modelId, sha256, recipe, release).
- `tests/unit/inference/live.test.ts`: the `returns the normalized status identity` expectation.
- `tests/unit/inference/factory.test.ts`: the default-model assertions if the default changed.

## 6. Verify

```sh
npm run typecheck
npx vitest run tests/unit/inference
npm run lint
```

All three must exit 0. A failing `contract.test.ts` after a re-capture means the server schema changed: fix the schema in `contract.ts` deliberately, do not relax it.

## 7. Confirm the shape before shipping

- `sha256Verified` must come from the server. Never set it to `true` in client code.
- The UI must keep the research notice and show source and identity. Results from the mock must keep the simulated badge.

## Rollback

Revert the fixture and type commits, then set `VITE_DEFAULT_MODEL=B71` (or the previous arm) in the build environment. No data migration is involved; the client holds no persisted model state.
