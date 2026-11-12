/** Typed capture errors. Each carries a stable `code` for callers and tests. */
export class CaptureInputError extends Error {
  readonly code: 'invalid-frame' | 'invalid-message';

  constructor(code: 'invalid-frame' | 'invalid-message', message: string) {
    super(message);
    this.name = 'CaptureInputError';
    this.code = code;
  }
}

export class ModelValidationError extends Error {
  readonly field: string;

  constructor(field: string, message: string) {
    super(`${field}: ${message}`);
    this.name = 'ModelValidationError';
    this.field = field;
  }
}
