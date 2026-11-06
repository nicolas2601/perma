import emptyCompareUrl from './empty-compare.svg';
import waitingResponseUrl from './waiting-response.svg';
import offlineUrl from './offline.svg';
import serverProblemUrl from './server-problem.svg';
import permissionCameraUrl from './permission-camera.svg';
import fileProblemUrl from './file-problem.svg';
import exportDoneUrl from './export-done.svg';
import consentPrivacyUrl from './consent-privacy.svg';

export const illustrationUrls = {
  emptyCompare: emptyCompareUrl,
  waitingResponse: waitingResponseUrl,
  offline: offlineUrl,
  serverProblem: serverProblemUrl,
  permissionCamera: permissionCameraUrl,
  fileProblem: fileProblemUrl,
  exportDone: exportDoneUrl,
  consentPrivacy: consentPrivacyUrl,
} as const;

export type IllustrationName = keyof typeof illustrationUrls;

export const illustrationNames = Object.keys(illustrationUrls) as IllustrationName[];

export function illustrationUrl(name: IllustrationName): string {
  return illustrationUrls[name];
}
