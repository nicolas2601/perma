// Test-only MSW handlers. Never imported from production code paths (guarded by CI grep on dist/).
import { HttpResponse, http } from 'msw';
import { fixtureJson, type FixtureName } from './fixtures';
import { syntheticAnalyzeBody, syntheticSimulateBody } from './analyzeFixtures';

// Synthetic (not captured) analyze/simulate bodies: see analyzeFixtures.ts.
const TONE_STOPS: readonly number[] = [-16, -8, 0, 8, 16];

const SUCCESS_BY_MODE: Record<string, FixtureName> = {
  base: 'predictBase',
  tta: 'predictTta',
};

/** Default happy-path handlers, all backed by the captured fixtures. */
export const inferenceHandlers = [
  http.get('/api/status', () => HttpResponse.json(fixtureJson('mocoStatus'))),
  http.get('/api/report', () => HttpResponse.json(fixtureJson('report'))),
  http.post('/api/predict', ({ request }) => {
    const url = new URL(request.url);
    const mode = url.searchParams.get('mode') ?? 'base';
    if (url.searchParams.get('model') === 'MOCO_HAM7') {
      if (mode === 'tta') return HttpResponse.json({ error: { code: 'UNSUPPORTED_INFERENCE_MODE' } }, { status: 422 });
      return HttpResponse.json(fixtureJson('mocoPredict'));
    }
    return HttpResponse.json(fixtureJson(SUCCESS_BY_MODE[mode] ?? 'predictBase'));
  }),  http.post('/api/analyze', ({ request }) => {
    const model = new URL(request.url).searchParams.get('model');
    if (model !== 'MOCO_HAM7') return HttpResponse.json({ error: { code: 'UNKNOWN_MODEL' } }, { status: 422 });
    return HttpResponse.json(syntheticAnalyzeBody());
  }),
  http.post('/api/simulate-tone', async ({ request }) => {
    const form = await request.formData();
    const delta = Number(form.get('delta_l'));
    if (!TONE_STOPS.includes(delta)) {
      return HttpResponse.json({ error: { code: 'INVALID_DELTA' } }, { status: 422 });
    }
    return HttpResponse.json(syntheticSimulateBody(delta));
  }),
];
