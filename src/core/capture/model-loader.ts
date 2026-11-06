import { passesAcceptanceGate, validateBlurModel, type BlurModel } from './blur-model';
import { ModelValidationError } from './errors';

export type BlurHeadLoad =
  | { readonly enabled: true; readonly model: BlurModel }
  | { readonly enabled: false; readonly reason: string };

type RawModelModule = { readonly default: string };

/**
 * Loads the blur head on demand. The JSON is imported as raw text, parsed and validated here.
 * The head is enabled only if the model validates AND its recorded acceptance gate still holds.
 * Any failure disables the head and leaves the deterministic rules in charge.
 */
export async function loadBlurHead(
  importModel: () => Promise<RawModelModule> = () => import('./model/camera-blur-model.json?raw'),
): Promise<BlurHeadLoad> {
  let text: string;
  try {
    text = (await importModel()).default;
  } catch {
    return { enabled: false, reason: 'model-unavailable' };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { enabled: false, reason: 'model-not-json' };
  }
  try {
    const model = validateBlurModel(parsed);
    return passesAcceptanceGate(model)
      ? { enabled: true, model }
      : { enabled: false, reason: 'acceptance-gate-not-passed' };
  } catch (error) {
    if (error instanceof ModelValidationError) return { enabled: false, reason: `model-invalid:${error.field}` };
    throw error;
  }
}
