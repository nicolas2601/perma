import { CaptureInputError } from './errors';
import type { AdviceId } from './types';

/** Id used for failures that cannot be tied to a frame (malformed message). */
export const UNBOUND_TASK_ID = -1;

const ADVICE_IDS: readonly AdviceId[] = [
  'closer', 'more-light', 'avoid-glare', 'hold-still', 'center-area', 'check-focus', 'none',
];

export type WorkerInbound =
  | { readonly kind: 'configure'; readonly model: unknown }
  | {
    readonly kind: 'analyze';
    readonly id: number;
    readonly width: number;
    readonly height: number;
    readonly active: AdviceId;
    readonly pixels: ArrayBuffer;
  };

export type WorkerFailureCode = 'invalid-frame' | 'invalid-message';

export type WorkerOutbound =
  | { readonly kind: 'reading'; readonly id: number; readonly candidate: AdviceId; readonly abstained: boolean }
  | { readonly kind: 'failure'; readonly id: number; readonly code: WorkerFailureCode };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isTaskId = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;
const isAdviceId = (value: unknown): value is AdviceId => ADVICE_IDS.includes(value as AdviceId);

function parseAnalyze(data: Record<string, unknown>): WorkerInbound {
  if (!isTaskId(data['id']) || !isAdviceId(data['active'])) {
    throw new CaptureInputError('invalid-message', 'analyze needs a task id and a known active advice');
  }
  if (!(data['pixels'] instanceof ArrayBuffer)) {
    throw new CaptureInputError('invalid-message', 'analyze needs an ArrayBuffer of pixels');
  }
  const width = data['width'];
  const height = data['height'];
  if (typeof width !== 'number' || typeof height !== 'number') {
    throw new CaptureInputError('invalid-message', 'analyze needs numeric width and height');
  }
  return { kind: 'analyze', id: data['id'], width, height, active: data['active'], pixels: data['pixels'] };
}

/** Validates a message received by the worker. The worker never trusts the main thread's shape. */
export function parseWorkerInbound(data: unknown): WorkerInbound {
  if (!isRecord(data)) throw new CaptureInputError('invalid-message', 'message must be an object');
  if (data['kind'] === 'configure') return { kind: 'configure', model: data['model'] };
  if (data['kind'] === 'analyze') return parseAnalyze(data);
  throw new CaptureInputError('invalid-message', `unknown message kind: ${String(data['kind'])}`);
}

/** Validates a reply received by the main thread. Anything malformed is ignored by the client. */
export function parseWorkerOutbound(data: unknown): WorkerOutbound | null {
  if (!isRecord(data) || (!isTaskId(data['id']) && data['id'] !== UNBOUND_TASK_ID)) return null;
  if (data['kind'] === 'reading' && isAdviceId(data['candidate']) && typeof data['abstained'] === 'boolean') {
    return { kind: 'reading', id: data['id'] as number, candidate: data['candidate'], abstained: data['abstained'] };
  }
  if (data['kind'] === 'failure' && (data['code'] === 'invalid-frame' || data['code'] === 'invalid-message')) {
    return { kind: 'failure', id: data['id'] as number, code: data['code'] };
  }
  return null;
}
