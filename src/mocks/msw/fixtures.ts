// Test-only. Raw captures from the live API (see docs/api-notes.md). Never imported by production code.
import type { JsonBodyType } from 'msw';
import mocoPredictRaw from '../../../fixtures/api/predict-MOCO_HAM7-base.json?raw';
import mocoStatusRaw from '../../../fixtures/api/status-MOCO_HAM7.json?raw';
import probeEmptyRaw from '../../../fixtures/api/probe-empty-file.json?raw';
import probeNoFileRaw from '../../../fixtures/api/probe-no-file.json?raw';
import probeWrongTypeRaw from '../../../fixtures/api/probe-wrong-type.json?raw';

export const FIXTURE_TEXT = {
  mocoPredict: mocoPredictRaw,
  mocoStatus: mocoStatusRaw,
  probeEmptyFile: probeEmptyRaw,
  probeWrongType: probeWrongTypeRaw,
  probeNoFile: probeNoFileRaw,
} as const;

export type FixtureName = keyof typeof FIXTURE_TEXT;

/** Parses a captured body. Typed for MSW responses; contract tests still validate it with the zod schemas. */
export function fixtureJson(name: FixtureName): JsonBodyType {
  return JSON.parse(FIXTURE_TEXT[name]) as JsonBodyType;
}
