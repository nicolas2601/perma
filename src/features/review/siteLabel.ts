/** Body-site codes stored in the record. Labels are localized in the review copy; the codes never leave the record. */
export const SITE_COPY_KEY = {
  face: 'siteFace',
  scalp: 'siteScalp',
  trunk: 'siteTrunk',
  upperLimb: 'siteUpperLimb',
  lowerLimb: 'siteLowerLimb',
} as const;

export type SiteCopyKey = (typeof SITE_COPY_KEY)[keyof typeof SITE_COPY_KEY];

/** Maps a stored site code to its copy key; unknown codes return null so they are never shown raw. */
export function siteCopyKey(code: string | null): SiteCopyKey | null {
  if (code === null || !Object.hasOwn(SITE_COPY_KEY, code)) return null;
  return SITE_COPY_KEY[code as keyof typeof SITE_COPY_KEY];
}
