import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';
import { homeEntryVariants, reduceFromPreference } from '../core/motion';

/**
 * The single Home entry sequence. Mount it once per Home visit; children are HomeEntryItem blocks.
 * Do not nest entries, and do not use HomeEntryItem for hover or per-section reveals.
 */
export function HomeEntry({ children }: { children: ReactNode }) {
  const reduce = reduceFromPreference(useReducedMotion());
  const { container } = homeEntryVariants(reduce);
  return (
    <motion.div initial="hidden" animate="show" variants={container}>
      {children}
    </motion.div>
  );
}

export function HomeEntryItem({ children }: { children: ReactNode }) {
  const reduce = reduceFromPreference(useReducedMotion());
  const { item } = homeEntryVariants(reduce);
  return <motion.div variants={item}>{children}</motion.div>;
}
