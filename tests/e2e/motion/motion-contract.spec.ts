import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/**
 * Motion contract in real Chromium. The global CSS is injected from src/motion/motion.css and
 * probe elements are toggled; we then read document.getAnimations() like the ADR-R3 test plan.
 */
const MOTION_CSS = readFileSync(resolve(process.cwd(), 'src/motion/motion.css'), 'utf8');
const MAX_REDUCED_MS = 100;
const ACCORDION_MS = 200;

const PROBE_HTML = `
  <div id="motion-probe" style="position:fixed;left:0;top:0;width:320px;z-index:9999;background:#fff">
    <div id="acc" class="perma-accordion-body" style="grid-template-rows:0fr">
      <div class="perma-accordion-inner"><p>criterion</p></div>
    </div>
    <button id="press" class="perma-press" type="button">press</button>
    <div id="move" data-motion="move" style="width:40px;height:20px;background:#006779"></div>
  </div>`;

async function installProbe(page: Page): Promise<void> {
  await page.goto('/');
  await page.addStyleTag({ content: MOTION_CSS });
  await page.evaluate((html) => {
    document.body.insertAdjacentHTML('beforeend', html);
  }, PROBE_HTML);
}

/**
 * Flips the probe state so every motion source fires once. Reading the start value first forces
 * a style flush, so the browser sees the old state and then the new one.
 */
async function triggerMotion(page: Page): Promise<string> {
  return page.evaluate(() => {
    const acc = document.getElementById('acc') as HTMLElement;
    const move = document.getElementById('move') as HTMLElement;
    const accordionBefore = getComputedStyle(acc).gridTemplateRows;
    acc.style.gridTemplateRows = '1fr';
    move.style.transform = 'translateX(40px)';
    return accordionBefore;
  });
}

interface AnimationSummary {
  readonly ms: number;
  readonly props: string[];
}

async function summarizeAnimations(page: Page): Promise<AnimationSummary[]> {
  return page.evaluate(() =>
    document.getAnimations().map((animation) => {
      const effect = animation.effect as KeyframeEffect;
      return {
        ms: Number(effect.getComputedTiming().duration),
        props: effect.getKeyframes().flatMap((frame) => Object.keys(frame)),
      };
    }),
  );
}

test.describe('motion contract, reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('accordion and move probes animate at most 100 ms with no transform keyframes', async ({ page }) => {
    await installProbe(page);
    const accordionBefore = await triggerMotion(page);
    expect(accordionBefore).not.toBe('1fr');
    await expect.poll(async () => (await summarizeAnimations(page)).length).toBeGreaterThan(0);
    const animations = await summarizeAnimations(page);
    for (const animation of animations) {
      expect(animation.ms).toBeLessThanOrEqual(MAX_REDUCED_MS);
      expect(animation.props.join(' ')).not.toMatch(/transform/i);
    }
  });

  test('press and accordion resolve their duration tokens to 100 ms', async ({ page }) => {
    await installProbe(page);
    const durations = await page.evaluate(() => ({
      accordion: getComputedStyle(document.getElementById('acc') as HTMLElement).transitionDuration,
      press: getComputedStyle(document.getElementById('press') as HTMLElement).transitionDuration,
    }));
    expect(durations.accordion).toBe('0.1s');
    expect(durations.press).toBe('0.1s');
  });
});

test.describe('motion contract, default motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('press declares explicit transition properties, never "all"', async ({ page }) => {
    await installProbe(page);
    const properties = await page.evaluate(() =>
      getComputedStyle(document.getElementById('press') as HTMLElement).transitionProperty,
    );
    expect(properties).not.toContain('all');
    expect(properties).toContain('transform');
    expect(properties).toContain('opacity');
  });

  test('accordion height runs for 200 ms in grid-template-rows', async ({ page }) => {
    await installProbe(page);
    const accordionBefore = await page.locator('#acc').evaluate((el) => {
      const before = getComputedStyle(el).gridTemplateRows;
      (el as HTMLElement).style.gridTemplateRows = '1fr';
      return before;
    });
    expect(accordionBefore).not.toBe('1fr');
    await expect.poll(async () => (await summarizeAnimations(page)).length).toBeGreaterThan(0);
    const animations = await summarizeAnimations(page);
    expect(animations.some((a) => a.ms === ACCORDION_MS)).toBe(true);
  });

  test('data-motion="move" elements move normally when motion is allowed', async ({ page }) => {
    await installProbe(page);
    const transform = await page.evaluate(() => {
      const move = document.getElementById('move') as HTMLElement;
      move.style.transform = 'translateX(40px)';
      return getComputedStyle(move).transform;
    });
    expect(transform).toBe('matrix(1, 0, 0, 1, 40, 0)');
  });
});
