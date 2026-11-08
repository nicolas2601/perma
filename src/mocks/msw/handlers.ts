// Test-only MSW handlers. Never imported from production code paths (guarded by CI grep on dist/).
import { HttpResponse, http } from 'msw';
import { fixtureJson, type FixtureName } from './fixtures';

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
  }),
];
