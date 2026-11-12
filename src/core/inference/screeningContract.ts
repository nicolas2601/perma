import { z } from 'zod';
import { CLASS_CODES, type ScreeningMetrics, type ScreeningResult } from './types';

/** Bound the backend enforces for the log offset (demo/backend/screening.py MAX_LOG_OFFSET). */
const MAX_LOG_OFFSET = 3;

const rate = z.number().finite().min(0).max(1);
const classCode = z.enum(CLASS_CODES);

const metricsSchema = z.object({
  target_recall: rate,
  target_to_nevus: rate,
  nevus_recall: rate,
  target_precision: rate,
  target_alert_rate: rate,
  macro_f1: rate,
});

const okScreeningSchema = z.object({
  status: z.literal('ok'),
  rule_id: z.string().min(1),
  target: classCode,
  log_offset: z.number().finite().min(0).max(MAX_LOG_OFFSET),
  pred: classCode,
  alert: z.boolean(),
  differs_from_pred: z.boolean(),
  development: z.object({ at_zero: metricsSchema, nested: metricsSchema }).nullable(),
});

const unavailableScreeningSchema = z.object({
  status: z.literal('unavailable'),
  reason: z.string().min(1),
});

/** `classification.screening` on /api/predict and /api/analyze (backend v10.3+). */
export const screeningSchema = z.discriminatedUnion('status', [okScreeningSchema, unavailableScreeningSchema]);

function toMetrics(metrics: z.infer<typeof metricsSchema>): ScreeningMetrics {
  return {
    targetRecall: metrics.target_recall,
    targetToNevus: metrics.target_to_nevus,
    nevusRecall: metrics.nevus_recall,
    targetPrecision: metrics.target_precision,
    targetAlertRate: metrics.target_alert_rate,
    macroF1: metrics.macro_f1,
  };
}

export function toScreening(body: z.infer<typeof screeningSchema>): ScreeningResult {
  if (body.status === 'unavailable') return { status: 'unavailable', reason: body.reason };
  return {
    status: 'ok',
    ruleId: body.rule_id,
    target: body.target,
    logOffset: body.log_offset,
    pred: body.pred,
    alert: body.alert,
    differsFromPred: body.differs_from_pred,
    development:
      body.development === null
        ? null
        : { atZero: toMetrics(body.development.at_zero), nested: toMetrics(body.development.nested) },
  };
}
