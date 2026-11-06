import { z } from 'zod';
import { EXAM_SCHEMA_VERSION, type StoredExam } from './types';

const criterionSchema = z.enum(['A', 'B', 'C', 'D', 'E']);
const exportFormatSchema = z.enum(['json', 'pdf']);
const countSchema = z.number().int().nonnegative();

const recordSchema = z.object({
  id: z.string().min(1),
  createdAt: z.string(),
  bodySite: z.string().nullable(),
  abcde: z.partialRecord(criterionSchema, z.string().min(1)),
  note: z.string(),
  priorImageId: z.string().nullable(),
  lastExport: z
    .object({ at: z.string(), format: exportFormatSchema, registryVersion: countSchema })
    .nullable(),
  registryVersion: countSchema,
});

const imageSchema = z.object({
  original: z.instanceof(Blob),
  upload: z.instanceof(Blob),
  name: z.string(),
  origin: z.enum(['camera', 'file', 'sample']),
});

export const storedExamSchema = z.object({
  schemaVersion: z.literal(EXAM_SCHEMA_VERSION),
  record: recordSchema,
  image: imageSchema.nullable(),
});

/**
 * Validates whatever the storage returned. Unknown schema versions and corrupt
 * payloads yield null, so the app starts clean instead of rendering partial data.
 */
export function parseStoredExam(input: unknown): StoredExam | null {
  const parsed = storedExamSchema.safeParse(input);
  return parsed.success ? parsed.data : null;
}
