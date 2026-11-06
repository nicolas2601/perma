import { PHASE_TINT, type Tint, type TintOrNeutral } from '@/ui/tints';

/** The six exam steps shown in the desktop rail, in order. Ids match PHASE_TINT. */
export const RAIL_STEPS = ['contexto', 'imagen', 'analisis', 'resultado', 'observaciones', 'revision'] as const;
export type RailStepId = (typeof RAIL_STEPS)[number];

const within = (path: string, base: string): boolean => path === base || path.startsWith(`${base}/`);

/** Step a route belongs to, or undefined for pages outside the journey (Home, guide, recovery). */
export function railStepOf(path: string): RailStepId | undefined {
  if (path === '/contexto') return 'contexto';
  if (within(path, '/imagen')) return 'imagen';
  if (within(path, '/envio')) return 'analisis';
  if (within(path, '/resultado') || path === '/inspeccion') return 'resultado';
  if (within(path, '/inspeccion') || within(path, '/examen')) return 'observaciones';
  if (within(path, '/revision')) return 'revision';
  return undefined;
}

export function railTint(step: RailStepId): TintOrNeutral {
  return PHASE_TINT[step] as Tint | 'neutral';
}

export interface RailProgress {
  hasSite: boolean;
  hasImage: boolean;
  hasResult: boolean;
  hasObservation: boolean;
  exported: boolean;
}

/** Done states derived from the record, never from the route, so the rail stays truthful after a reload. */
export function railDone(step: RailStepId, progress: RailProgress): boolean {
  switch (step) {
    case 'contexto': return progress.hasSite;
    case 'imagen': return progress.hasImage;
    case 'analisis': return progress.hasResult;
    case 'resultado': return progress.hasResult;
    case 'observaciones': return progress.hasObservation;
    case 'revision': return progress.exported;
  }
}
