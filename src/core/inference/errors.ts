import { InferenceError } from './types';

/** Raised when /api/analyze answers 404: the caller falls back to /api/predict (classification only). */
export class AnalyzeEndpointMissing extends InferenceError {
  constructor() {
    super('server-error', 'Analyze endpoint not available; falling back to predict');
    this.name = 'AnalyzeEndpointMissing';
  }
}
