import { ENTER_FRAMES, EXIT_FRAMES } from './constants';

/**
 * Two-threshold rule with dwell. The rule switches on only after ENTER_FRAMES consecutive readings past `on`,
 * and switches off only after EXIT_FRAMES consecutive readings past `off`. A null reading (no measurement)
 * changes nothing: the rule keeps its state and its counters.
 */
export class Trigger {
  private active = false;
  private run = 0;

  constructor(
    private readonly on: number,
    private readonly off: number,
    private readonly direction: 'above' | 'below',
  ) {}

  update(value: number | null): boolean {
    if (value === null) return this.active;
    if (this.active) {
      this.run = this.pastRelease(value) ? this.run + 1 : 0;
      if (this.run >= EXIT_FRAMES) this.reset(false);
    } else {
      this.run = this.pastOn(value) ? this.run + 1 : 0;
      if (this.run >= ENTER_FRAMES) this.reset(true);
    }
    return this.active;
  }

  private reset(active: boolean): void {
    this.active = active;
    this.run = 0;
  }

  private pastOn(value: number): boolean {
    return this.direction === 'above' ? value > this.on : value < this.on;
  }

  /** True when the reading is beyond the release level, i.e. the condition that keeps the rule on has ended. */
  private pastRelease(value: number): boolean {
    return this.direction === 'above' ? value <= this.off : value >= this.off;
  }
}
