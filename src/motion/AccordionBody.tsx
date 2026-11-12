import type { ReactNode } from 'react';
import { accordionRows } from '../core/motion';

/**
 * Height transition for one accordion body (ABCDE). The grid-rows value is set inline; the transition
 * lives in CSS (.perma-accordion-body in motion.css). Reduced motion shortens it to 100 ms through the same token.
 */
export function AccordionBody({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div className="perma-accordion-body" style={{ gridTemplateRows: accordionRows(open) }}>
      <div className="perma-accordion-inner">{children}</div>
    </div>
  );
}
