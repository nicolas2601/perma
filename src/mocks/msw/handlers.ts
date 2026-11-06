// Test-only MSW handlers. Never imported from production code paths (guarded by CI grep on dist/).
import { HttpResponse, http } from 'msw';
import { fixtureJson, type FixtureName } from './fixtures';

const SUCCESS_BY_MODE: Record<string, FixtureName> = {
  base: 'predictBase',
  tta: 'predictTta',
};

/** Default happy-path handlers, all backed by the captured fixtures. */
export const inferenceHandlers = [
  http.get('/api/status', () => HttpResponse.json(fixtureJson('status'))),
  http.get('/api/report', () => HttpResponse.json(fixtureJson('report'))),
  http.post('/api/predict', ({ request }) => {
    const mode = new URL(request.url).searchParams.get('mode') ?? 'base';
    return HttpResponse.json(fixtureJson(SUCCESS_BY_MODE[mode] ?? 'predictBase'));
  }),
];
