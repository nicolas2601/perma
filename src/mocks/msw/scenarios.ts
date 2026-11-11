// Test-only failure handlers for POST /api/predict. Never imported from production code paths.
// Only the 400 body is a real capture (fixtures/api/probe-empty-file.json). The rest are synthetic,
// because the discovery budget (2 predict calls + 3 probes) did not allow provoking them live.
import { HttpResponse, delay, http } from 'msw';
import { fixtureJson } from './fixtures';

export type HttpFailureScenario =
  | 'rate-limit'
  | 'server-error'
  | 'file-unavailable'
  | 'permission'
  | 'offline'
  | 'timeout'
  | 'invalid-response';

const PREDICT_PATH = '/api/predict';

/** Returns a one-shot handler per scenario, to be passed to `server.use(...)`. */
export function predictFailure(scenario: HttpFailureScenario) {
  return http.post(PREDICT_PATH, async () => respondWith(scenario));
}

async function respondWith(scenario: HttpFailureScenario): Promise<Response> {
  switch (scenario) {
    case 'rate-limit':
      return HttpResponse.json({ error: { code: 'RATE_LIMITED', message: 'synthetic' } }, { status: 429 });
    case 'server-error':
      return HttpResponse.json({ error: { code: 'INTERNAL', message: 'synthetic' } }, { status: 503 });
    case 'file-unavailable':
      return HttpResponse.json(fixtureJson('probeEmptyFile'), { status: 400 });
    case 'permission':
      return HttpResponse.json({ error: { code: 'FORBIDDEN', message: 'synthetic' } }, { status: 403 });
    case 'offline':
      return HttpResponse.error();
    case 'timeout':
      await delay('infinite');
      return HttpResponse.json(fixtureJson('mocoPredict'));
    case 'invalid-response':
      return HttpResponse.text('<html>gateway</html>', { status: 200, headers: { 'content-type': 'text/html' } });
  }
}
