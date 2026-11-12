// Test-only MSW handlers. Never imported from production code paths (guarded by CI grep on dist/).
import { HttpResponse, http } from 'msw';
import { fixtureJson } from './fixtures';
import { loadAnalyzeCapture, loadSimulateToneCapture } from '@/core/inference/captures';

const TONE_STOPS: readonly number[] = [-16, -8, 0, 8, 16];

/** Happy-path handlers replay the captured MOCO_HAM7 responses. Retired models answer 422, as upstream does. */
export const inferenceHandlers = [
  http.get('/api/status', () => HttpResponse.json(fixtureJson('mocoStatus'))),
  http.post('/api/predict', ({ request }) => {
    const url = new URL(request.url);
    if (url.searchParams.get('model') !== 'MOCO_HAM7') {
      return HttpResponse.json({ error: { code: 'UNKNOWN_MODEL' } }, { status: 422 });
    }
    return HttpResponse.json(fixtureJson('mocoPredict'));
  }),
  http.post('/api/analyze', async ({ request }) => {
    const model = new URL(request.url).searchParams.get('model');
    if (model !== 'MOCO_HAM7') return HttpResponse.json({ error: { code: 'UNKNOWN_MODEL' } }, { status: 422 });
    const capture = await loadAnalyzeCapture();
    if (capture === null) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    return HttpResponse.json(capture);
  }),
  http.post('/api/simulate-tone', async ({ request }) => {
    const form = await request.formData();
    const delta = Number(form.get('delta_l'));
    if (!TONE_STOPS.includes(delta)) {
      return HttpResponse.json({ error: { code: 'INVALID_DELTA' } }, { status: 422 });
    }
    const capture = await loadSimulateToneCapture(delta);
    if (capture === null) return HttpResponse.json({ error: { code: 'NOT_FOUND' } }, { status: 404 });
    return HttpResponse.json(capture);
  }),
];
