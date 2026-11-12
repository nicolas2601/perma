import type { ReactNode } from 'react';
import { Rail } from './rail/Rail';

/**
 * Desktop frame (lg and up): a fixed navigation rail and a centered content column.
 * Below lg it renders the screen untouched, so the mobile app is exactly as designed.
 */
export function DesktopFrame({ children }: { children: ReactNode }) {
  return (
    <>
      <Rail />
      <div className="lg:pl-66">
        <div className="mx-auto w-full md:max-w-160 lg:max-w-270">{children}</div>
      </div>
    </>
  );
}
