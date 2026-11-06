// Test-only. Raw captures from the live API (see docs/api-notes.md). Never imported by production code.
import type { JsonBodyType } from 'msw';
import predictBaseRaw from '../../../fixtures/api/predict-B71-base.json?raw';
import predictTtaRaw from '../../../fixtures/api/predict-B71-tta.json?raw';
import probeEmptyRaw from '../../../fixtures/api/probe-empty-file.json?raw';
import probeNoFileRaw from '../../../fixtures/api/probe-no-file.json?raw';
import probeWrongTypeRaw from '../../../fixtures/api/probe-wrong-type.json?raw';
import reportRaw from '../../../fixtures/api/report.json?raw';
import statusRaw from '../../../fixtures/api/status.json?raw';

export const FIXTURE_TEXT = {
  status: statusRaw,
  report: reportRaw,
  predictBase: predictBaseRaw,
  predictTta: predictTtaRaw,
  probeEmptyFile: probeEmptyRaw,
  probeWrongType: probeWrongTypeRaw,
  probeNoFile: probeNoFileRaw,
} as const;

export type FixtureName = keyof typeof FIXTURE_TEXT;

/** Parses a captured body. Typed for MSW responses; contract tests still validate it with the zod schemas. */
export function fixtureJson(name: FixtureName): JsonBodyType {
  return JSON.parse(FIXTURE_TEXT[name]) as JsonBodyType;
}
