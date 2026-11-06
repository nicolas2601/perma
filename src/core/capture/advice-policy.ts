import { MIN_DWELL_MS, STABILITY_FRAMES } from './constants';
import type { AdviceId } from './types';

/**
 * Decides what is shown. An advice changes only after STABILITY_FRAMES identical consecutive candidates, and a
 * shown advice stays at least MIN_DWELL_MS before another one can replace it. One advice at a time.
 */
export class AdvicePolicy {
  private active: AdviceId = 'none';
  private shownAt = Number.NEGATIVE_INFINITY;
  private pending: AdviceId | null = null;
  private streak = 0;

  get current(): AdviceId {
    return this.active;
  }

  /** Returns the new active advice when it changes, otherwise null. `nowMs` is a monotonic clock. */
  observe(candidate: AdviceId, nowMs: number): AdviceId | null {
    if (candidate === this.active) {
      this.reset();
      return null;
    }
    this.streak = candidate === this.pending ? this.streak + 1 : 1;
    this.pending = candidate;
    if (this.streak < STABILITY_FRAMES) return null;
    if (nowMs - this.shownAt < MIN_DWELL_MS) return null;
    this.active = candidate;
    this.shownAt = nowMs;
    this.reset();
    return candidate;
  }

  private reset(): void {
    this.pending = null;
    this.streak = 0;
  }
}
