import { createBlurPredictor, validateBlurModel } from './blur-model';
import { CaptureInputError } from './errors';
import { FramePipeline } from './frame-pipeline';
import { framePixelsFromBuffer } from './frame';
import { RuleEngine } from './rules';
import { parseWorkerInbound, UNBOUND_TASK_ID, type WorkerInbound, type WorkerOutbound } from './protocol';

type Analyze = Extract<WorkerInbound, { kind: 'analyze' }>;

/** One session: the pipeline and the rule engine keep their state (motion grid, hysteresis) between frames. */
interface Session {
  readonly pipeline: FramePipeline;
  readonly engine: RuleEngine;
}

function analyzeTask(session: Session, task: Analyze): WorkerOutbound {
  const reading = session.pipeline.analyze(framePixelsFromBuffer(task.pixels, task.width, task.height));
  const verdict = session.engine.observe(reading);
  return { kind: 'reading', id: task.id, candidate: verdict.candidate, abstained: verdict.abstained, status: verdict.status };
}

function configure(session: Session, model: unknown): null {
  session.pipeline.setPredictor(model === null ? null : createBlurPredictor(validateBlurModel(model)));
  return null;
}

function failureFor(error: unknown, id: number): WorkerOutbound {
  if (error instanceof CaptureInputError) return { kind: 'failure', id, code: error.code };
  return { kind: 'failure', id, code: 'invalid-message' };
}

/**
 * Worker-side message handler. Pure apart from its own session state; never throws, so a bad message
 * produces a typed failure reply instead of killing the worker.
 */
export function createWorkerHandler(): (data: unknown) => WorkerOutbound | null {
  const session: Session = { pipeline: new FramePipeline(), engine: new RuleEngine() };
  return (data) => {
    let task: WorkerInbound;
    try {
      task = parseWorkerInbound(data);
    } catch (error) {
      return failureFor(error, UNBOUND_TASK_ID);
    }
    if (task.kind === 'configure') {
      try {
        return configure(session, task.model);
      } catch (error) {
        return failureFor(error, UNBOUND_TASK_ID);
      }
    }
    try {
      return analyzeTask(session, task);
    } catch (error) {
      return failureFor(error, task.id);
    }
  };
}
