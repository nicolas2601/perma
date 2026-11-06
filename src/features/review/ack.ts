import type { ExamRecord } from '@/core/storage/types';

/**
 * Export acknowledgement rule (architecture G4/G5):
 * the ack is current only while the record it was given for is unchanged.
 * Language is not part of the record, so switching ES/EN never invalidates it.
 */
export function isAckCurrent(ackRegistryVersion: number | null, record: ExamRecord): boolean {
  return ackRegistryVersion !== null && ackRegistryVersion === record.registryVersion;
}

/** Acknowledgement may only be recorded for a download that actually started. */
export function canRecordAck(downloadStarted: boolean): boolean {
  return downloadStarted === true;
}
