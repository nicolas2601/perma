import { createBlurPredictor, validateBlurModel } from './blur-model';
import { CaptureInputError } from './errors';
import { FramePipeline } from './frame-pipeline';
import { framePixelsFromBuffer } from './frame';
import { chooseCandidate } from './rules';
import { parseWorkerInbound, UNBOUND_TASK_ID, type WorkerInbound, type WorkerOutbound } from './protocol';

type Analyze = Extract<WorkerInbound, { kind: 'analyze' }>;

function analyzeTask(pipeline: FramePipeline, task: Analyze): WorkerOutbound {
  const reading = pipeline.analyze(framePixelsFromBuffer(task.pixels, task.width, task.height));
  return {
    kind: 'reading',
    id: task.id,
    candidate: chooseCandidate(reading, task.active),
    abstained: reading.blur?.abstained ?? false,
  };
}

function configure(pipeline: FramePipeline, model: unknown): null {
  pipeline.setPredictor(model === null ? null : createBlurPredictor(validateBlurModel(model)));
  return null;
}

function failureFor(error: unknown, id: number): WorkerOutbound {
  if (error instanceof CaptureInputError) return { kind: 'failure', id, code: error.code };
  return { kind: 'failure', id, code: 'invalid-message' };
}

/**
 * Worker-side message handler. Pure apart from its own pipeline state; never throws, so a bad message
 * produces a typed failure reply instead of killing the worker.
 */
export function createWorkerHandler(): (data: unknown) => WorkerOutbound | null {
  const pipeline = new FramePipeline();
  return (data) => {
    let task: WorkerInbound;
    try {
      task = parseWorkerInbound(data);
    } catch (error) {
      return failureFor(error, UNBOUND_TASK_ID);
    }
    if (task.kind === 'configure') {
      try {
        return configure(pipeline, task.model);
      } catch (error) {
        return failureFor(error, UNBOUND_TASK_ID);
      }
    }
    try {
      return analyzeTask(pipeline, task);
    } catch (error) {
      return failureFor(error, task.id);
    }
  };
}
