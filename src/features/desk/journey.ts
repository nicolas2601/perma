import { PHASE_TINT } from '@/ui/tints';
import type { StepDef } from '@/ui/Stepper';
import { CAPTURE_PATH, CONTEXT_PATH } from './recoveryPaths';

/** The six journey steps, in order. Ids match the keys of PHASE_TINT. */
export const JOURNEY_STEP_IDS = ['contexto', 'imagen', 'analisis', 'resultado', 'observaciones', 'revision'] as const;
export type JourneyStepId = (typeof JOURNEY_STEP_IDS)[number];
export const JOURNEY_TOTAL = JOURNEY_STEP_IDS.length;

const SEND_PATH = '/envio';

const STEP_LABEL_KEY: Record<JourneyStepId, string> = {
  contexto: 'stepContexto',
  imagen: 'stepImagen',
  analisis: 'stepAnalisis',
  resultado: 'stepResultado',
  observaciones: 'stepObservaciones',
  revision: 'stepRevision',
};

function isWithin(path: string, base: string): boolean {
  return path === base || path.startsWith(`${base}/`);
}

/** Journey step of a route, or undefined for pages outside the journey (Home, guide, recovery). */
export function journeyStepId(path: string): JourneyStepId | undefined {
  if (path === CONTEXT_PATH) return 'contexto';
  if (isWithin(path, CAPTURE_PATH)) return 'imagen';
  if (isWithin(path, SEND_PATH)) return 'analisis';
  return undefined;
}

export function journeySteps(t: (key: string) => string): StepDef[] {
  return JOURNEY_STEP_IDS.map((id) => ({ id, label: t(STEP_LABEL_KEY[id]), tint: PHASE_TINT[id] }));
}
