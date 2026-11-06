import { CaptureInputError } from './errors';
import type { AdviceId, ChipState, GuideStatus } from './types';

/** Id used for failures that cannot be tied to a frame (malformed message). */
export const UNBOUND_TASK_ID = -1;

const ADVICE_IDS: readonly AdviceId[] = [
  'less-light', 'more-light', 'avoid-glare', 'hold-still', 'closer', 'farther', 'center-area', 'check-focus', 'none',
];
const CHIP_STATES: readonly ChipState[] = ['ok', 'revisar', 'sin-dato'];

export type WorkerInbound =
  | { readonly kind: 'configure'; readonly model: unknown }
  | {
    readonly kind: 'analyze';
    readonly id: number;
    readonly width: number;
    readonly height: number;
    readonly pixels: ArrayBuffer;
  };

export type WorkerFailureCode = 'invalid-frame' | 'invalid-message';

export type WorkerOutbound =
  | {
    readonly kind: 'reading';
    readonly id: number;
    readonly candidate: AdviceId;
    readonly abstained: boolean;
    readonly status: GuideStatus;
  }
  | { readonly kind: 'failure'; readonly id: number; readonly code: WorkerFailureCode };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isTaskId = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value) && value >= 0;
const isAdviceId = (value: unknown): value is AdviceId => ADVICE_IDS.includes(value as AdviceId);
const isChipState = (value: unknown): value is ChipState => CHIP_STATES.includes(value as ChipState);

function parseAnalyze(data: Record<string, unknown>): WorkerInbound {
  if (!isTaskId(data['id'])) {
    throw new CaptureInputError('invalid-message', 'analyze needs a task id');
  }
  if (!(data['pixels'] instanceof ArrayBuffer)) {
    throw new CaptureInputError('invalid-message', 'analyze needs an ArrayBuffer of pixels');
  }
  const width = data['width'];
  const height = data['height'];
  if (typeof width !== 'number' || typeof height !== 'number') {
    throw new CaptureInputError('invalid-message', 'analyze needs numeric width and height');
  }
  return { kind: 'analyze', id: data['id'], width, height, pixels: data['pixels'] };
}

/** Validates a message received by the worker. The worker never trusts the main thread's shape. */
export function parseWorkerInbound(data: unknown): WorkerInbound {
  if (!isRecord(data)) throw new CaptureInputError('invalid-message', 'message must be an object');
  if (data['kind'] === 'configure') return { kind: 'configure', model: data['model'] };
  if (data['kind'] === 'analyze') return parseAnalyze(data);
  throw new CaptureInputError('invalid-message', `unknown message kind: ${String(data['kind'])}`);
}

function parseStatus(value: unknown): GuideStatus | null {
  if (!isRecord(value)) return null;
  const { focus, light, distance } = value;
  if (!isChipState(focus) || !isChipState(light) || !isChipState(distance)) return null;
  return { focus, light, distance };
}

/** Validates a reply received by the main thread. Anything malformed is ignored by the client. */
export function parseWorkerOutbound(data: unknown): WorkerOutbound | null {
  if (!isRecord(data) || (!isTaskId(data['id']) && data['id'] !== UNBOUND_TASK_ID)) return null;
  if (data['kind'] === 'reading') {
    const status = parseStatus(data['status']);
    if (!isAdviceId(data['candidate']) || typeof data['abstained'] !== 'boolean' || !status) return null;
    return { kind: 'reading', id: data['id'] as number, candidate: data['candidate'], abstained: data['abstained'], status };
  }
  if (data['kind'] === 'failure' && (data['code'] === 'invalid-frame' || data['code'] === 'invalid-message')) {
    return { kind: 'failure', id: data['id'] as number, code: data['code'] };
  }
  return null;
}
