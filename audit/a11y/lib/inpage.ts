/*
 * In-page measurements. Playwright serializes each function with page.evaluate,
 * so every function carries its own helpers and references no module scope.
 */

export interface ContrastFail {
  readonly text: string;
  readonly selector: string;
  readonly ratio: number;
  readonly required: number;
  readonly fg: string;
  readonly bg: string;
}

export interface ContrastReport {
  readonly checked: number;
  readonly unverifiable: number;
  readonly fails: ContrastFail[];
}

export function measureContrast(): ContrastReport {
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('2d canvas unavailable');
  // Normalizes any CSS color (oklch, color-mix, rgb) to sRGB 0-255 + alpha 0-1.
  const toRgba = (css: string): number[] => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000000';
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  };
  const chainOf = (el: Element): Element[] => {
    const out: Element[] = [];
    for (let e: Element | null = el; e; e = e.parentElement) out.unshift(e);
    return out;
  };
  const backdrop = (el: Element): { rgb: number[]; complex: boolean } => {
    let rgb = [255, 255, 255];
    let complex = false;
    for (const e of chainOf(el)) {
      const cs = getComputedStyle(e);
      if (cs.backgroundImage !== 'none') complex = true;
      const [r, g, b, a] = toRgba(cs.backgroundColor);
      if (a > 0) rgb = rgb.map((v, i) => [r, g, b][i] * a + v * (1 - a));
    }
    return { rgb, complex };
  };
  const luminance = (rgb: number[]): number => {
    const [r, g, b] = rgb.map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratioOf = (a: number[], b: number[]): number => {
    const la = luminance(a);
    const lb = luminance(b);
    return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
  };
  const isVisible = (el: Element): boolean => {
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return r.width > 1 && r.height > 1 && cs.visibility !== 'hidden' && cs.display !== 'none';
  };
  const hasOwnText = (el: Element): boolean =>
    [...el.childNodes].some((n) => n.nodeType === Node.TEXT_NODE && (n.textContent ?? '').trim() !== '');
  const describe = (el: Element): string => {
    const cls = typeof el.className === 'string' ? el.className.split(' ')[0] : '';
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ''}${cls ? `.${cls}` : ''}`;
  };

  let checked = 0;
  let unverifiable = 0;
  const fails: ContrastFail[] = [];
  for (const el of document.querySelectorAll('body *')) {
    if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(el.tagName) || !hasOwnText(el) || !isVisible(el)) continue;
    const cs = getComputedStyle(el);
    const opacity = chainOf(el).reduce((p, e) => p * Number(getComputedStyle(e).opacity), 1);
    const bd = backdrop(el);
    if (bd.complex || opacity < 1) {
      unverifiable += 1;
      continue;
    }
    const [r, g, b, a] = toRgba(cs.color);
    const fg = [r, g, b].map((v, i) => v * a + bd.rgb[i] * (1 - a));
    const size = parseFloat(cs.fontSize);
    const bold = Number(cs.fontWeight) >= 700;
    const required = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    const ratio = Math.round(ratioOf(fg, bd.rgb) * 100) / 100;
    checked += 1;
    if (ratio < required) {
      const text = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
      fails.push({
        text,
        selector: describe(el),
        ratio,
        required,
        fg: `rgb(${fg.map(Math.round).join(',')})`,
        bg: `rgb(${bd.rgb.map(Math.round).join(',')})`,
      });
    }
  }
  return { checked, unverifiable, fails: fails.slice(0, 60) };
}

export interface TargetItem {
  readonly selector: string;
  readonly width: number;
  readonly height: number;
  readonly spacingExempt: boolean;
}

export interface TargetReport {
  readonly total: number;
  readonly under24: TargetItem[];
  readonly under44Count: number;
}

export function measureTargets(): TargetReport {
  const SELECTOR =
    'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=tab], [role=checkbox], [role=radio], [role=switch], [role=menuitem]';
  const describe = (el: Element): string => {
    const label = el.getAttribute('aria-label') ?? (el.textContent ?? '').trim();
    return `${el.tagName.toLowerCase()}:${label.replace(/\s+/g, ' ').slice(0, 50)}`;
  };
  const items = [...document.querySelectorAll(SELECTOR)]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return (
        r.width > 1 &&
        r.height > 1 &&
        cs.visibility !== 'hidden' &&
        cs.display !== 'none' &&
        cs.opacity !== '0' &&
        !(el as HTMLButtonElement).disabled &&
        !el.closest('[inert]')
      );
    })
    .map((el) => ({ el, r: el.getBoundingClientRect() }));

  const under24: TargetItem[] = [];
  let under44Count = 0;
  for (const it of items) {
    const { width, height, left, top } = it.r;
    if (width < 44 || height < 44) under44Count += 1;
    if (width >= 24 && height >= 24) continue;
    const cx = left + width / 2;
    const cy = top + height / 2;
    // WCAG 2.5.8 spacing exception, approximated with a 24x24 square around the target center.
    const spacingExempt = items.some((o) => {
      if (o.el === it.el) return false;
      const q = o.r;
      return q.left < cx + 12 && q.right > cx - 12 && q.top < cy + 12 && q.bottom > cy - 12;
    });
    under24.push({
      selector: describe(it.el),
      width: Math.round(width * 10) / 10,
      height: Math.round(height * 10) / 10,
      spacingExempt,
    });
  }
  return { total: items.length, under24: under24.slice(0, 80), under44Count };
}

export interface ReflowReport {
  readonly viewportWidth: number;
  readonly scrollWidth: number;
  readonly overflowPx: number;
  readonly clipped: string[];
}

export function measureReflow(): ReflowReport {
  const vw = document.documentElement.clientWidth;
  const sw = document.documentElement.scrollWidth;
  const clipped = [...document.querySelectorAll('body *')]
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 1 && r.right > vw + 1 && getComputedStyle(el).position !== 'fixed';
    })
    .slice(0, 12)
    .map((el) => {
      const label = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
      return `${el.tagName.toLowerCase()}:${label}`;
    });
  return { viewportWidth: vw, scrollWidth: sw, overflowPx: Math.max(0, sw - vw), clipped };
}

export interface LiveRegion {
  readonly role: string | null;
  readonly live: string | null;
  readonly text: string;
}

export function measureLiveRegions(): LiveRegion[] {
  return [...document.querySelectorAll('[aria-live], [role=status], [role=alert]')]
    .slice(0, 20)
    .map((el) => ({
      role: el.getAttribute('role'),
      live: el.getAttribute('aria-live'),
      text: (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80),
    }));
}

export interface MotionReport {
  readonly reducedMotionMatches: boolean;
  readonly longDeclared: string[];
  readonly animations: Array<{ kind: string; durationMs: number; transform: boolean; infinite: boolean; target: string }>;
}

export function measureMotion(): MotionReport {
  const parseMs = (list: string): number[] =>
    list.split(',').map((s) => {
      const t = s.trim();
      return t.endsWith('ms') ? parseFloat(t) : parseFloat(t) * 1000;
    });
  const longDeclared: string[] = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    const declared = [...parseMs(cs.transitionDuration), ...parseMs(cs.animationDuration)];
    if (declared.some((ms) => ms > 100) && cs.transitionProperty !== 'none') {
      const cls = typeof el.className === 'string' ? el.className.split(' ')[0] : '';
      longDeclared.push(`${el.tagName.toLowerCase()}${cls ? `.${cls}` : ''}`);
    }
  }
  const animations = document.getAnimations().map((a) => {
    const effect = a.effect as KeyframeEffect | null;
    const timing = effect?.getTiming();
    const frames = effect?.getKeyframes() ?? [];
    const isCss = 'transitionProperty' in a;
    const target = effect?.target as Element | null;
    return {
      kind: isCss ? 'css-transition' : a.constructor.name,
      durationMs: Number(timing?.duration ?? 0),
      transform: frames.some((f) => typeof f.transform === 'string' && f.transform !== 'none'),
      infinite: timing?.iterations === Infinity,
      target: target ? target.tagName.toLowerCase() : 'unknown',
    };
  });
  return {
    reducedMotionMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
    longDeclared: longDeclared.slice(0, 40),
    animations: animations.slice(0, 60),
  };
}

export interface FocusInfo {
  readonly tag: string;
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly outlineStyle: string;
  readonly outlineWidth: number;
  readonly boxShadow: string;
  readonly obscuredBy: string | null;
}

export function describeActive(): FocusInfo | null {
  const el = document.activeElement;
  if (!el || el === document.body || el === document.documentElement) return null;
  const r = el.getBoundingClientRect();
  const cs = getComputedStyle(el);
  const name =
    el.getAttribute('aria-label') ??
    (el.textContent ?? '').trim().replace(/\s+/g, ' ') ??
    el.getAttribute('title') ??
    '';
  const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
  const obscured = top !== null && !el.contains(top) && !top.contains(el);
  return {
    tag: el.tagName.toLowerCase(),
    name: name.slice(0, 60),
    x: Math.round(r.left),
    y: Math.round(r.top),
    width: Math.round(r.width),
    height: Math.round(r.height),
    outlineStyle: cs.outlineStyle,
    outlineWidth: parseFloat(cs.outlineWidth),
    boxShadow: cs.boxShadow,
    obscuredBy: obscured && top ? `${top.tagName.toLowerCase()}:${(top.textContent ?? '').trim().slice(0, 30)}` : null,
  };
}
