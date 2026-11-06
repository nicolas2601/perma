import {
  CLINICAL_AGE_MAX,
  CLINICAL_DURATIONS,
  CLINICAL_HISTORY_MAX,
  CLINICAL_SYMPTOMS,
  EXAM_SCHEMA_VERSION,
  type StoredExam,
} from './types';

const CRITERIA = ['A', 'B', 'C', 'D', 'E'] as const;
const EXPORT_FORMATS = ['csv', 'json', 'pdf'] as const;
const IMAGE_ORIGINS = ['camera', 'file', 'sample'] as const;

type Obj = Record<string, unknown>;

const isObject = (value: unknown): value is Obj => typeof value === 'object' && value !== null;
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0;
const isAge = (value: unknown): boolean =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= CLINICAL_AGE_MAX;
const isUniqueSymptomList = (value: unknown): boolean =>
  Array.isArray(value) &&
  value.every((item) => oneOf(CLINICAL_SYMPTOMS, item)) &&
  new Set(value).size === value.length;
const isHistory = (value: unknown): boolean =>
  typeof value === 'string' && value.length <= CLINICAL_HISTORY_MAX;

/** Each field is optional; a present field must be well formed. */
export function isClinicalContext(value: unknown): boolean {
  if (!isObject(value)) return false;
  const { ageYears, duration, symptoms, history } = value;
  return (
    (ageYears === undefined || isAge(ageYears)) &&
    (duration === undefined || oneOf(CLINICAL_DURATIONS, duration)) &&
    (symptoms === undefined || isUniqueSymptomList(symptoms)) &&
    (history === undefined || isHistory(history))
  );
}
const isStringOrNull = (value: unknown): boolean => value === null || typeof value === 'string';
const oneOf = (list: readonly string[], value: unknown): boolean =>
  typeof value === 'string' && list.includes(value);

function isAbcde(value: unknown): boolean {
  if (!isObject(value)) return false;
  return Object.entries(value).every(
    ([key, item]) => oneOf(CRITERIA, key) && typeof item === 'string' && item.length > 0,
  );
}

function isLastExport(value: unknown): boolean {
  if (value === null) return true;
  return (
    isObject(value) &&
    typeof value.at === 'string' &&
    oneOf(EXPORT_FORMATS, value.format) &&
    isCount(value.registryVersion)
  );
}

function isRecord(value: unknown): boolean {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.createdAt === 'string' &&
    isStringOrNull(value.bodySite) &&
    isAbcde(value.abcde) &&
    typeof value.note === 'string' &&
    isStringOrNull(value.priorImageId) &&
    isLastExport(value.lastExport) &&
    isCount(value.registryVersion) &&
    (value.clinicalContext === undefined || isClinicalContext(value.clinicalContext))
  );
}

function isImage(value: unknown): boolean {
  if (value === null) return true;
  return (
    isObject(value) &&
    value.original instanceof Blob &&
    value.upload instanceof Blob &&
    typeof value.name === 'string' &&
    oneOf(IMAGE_ORIGINS, value.origin)
  );
}

function isResult(value: unknown): boolean {
  if (value === null) return true;
  if (!isObject(value) || !isObject(value.scores)) return false;
  return (
    oneOf(['live', 'mock'], value.source) &&
    typeof value.model === 'string' &&
    Object.values(value.scores).every((score) => typeof score === 'number' && Number.isFinite(score))
  );
}

/**
 * Validates whatever the storage returned. Unknown schema versions and corrupt
 * payloads yield null, so the app starts clean instead of rendering partial data.
 * Plain guards instead of a schema library: this runs before first paint.
 */
export function parseStoredExam(input: unknown): StoredExam | null {
  if (!isObject(input)) return null;
  if (input.schemaVersion !== EXAM_SCHEMA_VERSION) return null;
  if (!isRecord(input.record) || !isImage(input.image)) return null;
  if (input.result !== undefined && !isResult(input.result)) return null;
  return input as unknown as StoredExam;
}
