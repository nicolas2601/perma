import { describe, expect, it } from 'vitest';
import { SITE_COPY_KEY, siteCopyKey } from '@/features/review/siteLabel';
import { copy as review } from '@/features/review/copy';

describe('body site labels', () => {
  it('maps every stored site code to a localized copy key', () => {
    for (const code of Object.keys(SITE_COPY_KEY)) {
      const key = siteCopyKey(code);
      expect(key).not.toBeNull();
      expect(review.es[key as keyof typeof review.es]).toBeTruthy();
      expect(review.en[key as keyof typeof review.en]).toBeTruthy();
    }
  });

  it('never returns a raw code for unknown or missing sites', () => {
    expect(siteCopyKey(null)).toBeNull();
    expect(siteCopyKey('unknown-site')).toBeNull();
    expect(siteCopyKey('toString')).toBeNull();
  });
});
