import { STABILITY_FRAMES } from './constants';
import type { AdviceId } from './types';

/**
 * Shows an advice only after STABILITY_FRAMES identical consecutive candidates.
 * One advice at a time: the active advice is replaced, never stacked.
 */
export class AdvicePolicy {
  private active: AdviceId = 'none';
  private pending: AdviceId | null = null;
  private streak = 0;

  get current(): AdviceId {
    return this.active;
  }

  /** Returns the new active advice when it changes, otherwise null. */
  observe(candidate: AdviceId): AdviceId | null {
    if (candidate === this.active) {
      this.reset();
      return null;
    }
    this.streak = candidate === this.pending ? this.streak + 1 : 1;
    this.pending = candidate;
    if (this.streak < STABILITY_FRAMES) return null;
    this.active = candidate;
    this.reset();
    return candidate;
  }

  private reset(): void {
    this.pending = null;
    this.streak = 0;
  }
}
