// Reads Lighthouse JSON runs and prints per-route median of LCP, CLS, TBT, perf score.
import { readFileSync } from 'node:fs';
const routes = ['root', 'contexto', 'imagen'];
const median = (xs) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };
for (const r of routes) {
  const runs = [1, 2, 3].map((i) => JSON.parse(readFileSync(`audit/perf/lh/${r}-${i}.json`, 'utf8')));
  const pick = (f) => runs.map(f);
  const lcp = pick((j) => j.audits['largest-contentful-paint'].numericValue);
  const cls = pick((j) => j.audits['cumulative-layout-shift'].numericValue);
  const tbt = pick((j) => j.audits['total-blocking-time'].numericValue);
  const score = pick((j) => Math.round(j.categories.performance.score * 100));
  console.log(`${r}: LCP median ${(median(lcp) / 1000).toFixed(2)} s [${lcp.map((x) => (x / 1000).toFixed(2)).join(', ')}] | CLS median ${median(cls).toFixed(3)} [${cls.map((x) => x.toFixed(3)).join(', ')}] | TBT median ${Math.round(median(tbt))} ms [${tbt.map(Math.round).join(', ')}] | perf median ${median(score)} [${score.join(', ')}]`);
}
