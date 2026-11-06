import type { Locale } from '@/core/i18n/contract';
import type { ChipState, GuideStatus } from '@/core/capture/types';
import { copy } from './copy';

type ChipKey = keyof GuideStatus;

const CHIPS: readonly ChipKey[] = ['focus', 'light', 'distance'];

/** Icon plus text per state, so no state is carried by colour alone. Decorative: the text is the label. */
function ChipIcon({ state }: { readonly state: ChipState }) {
  const common = { width: 14, height: 14, viewBox: '0 0 16 16', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, 'aria-hidden': true, focusable: false } as const;
  if (state === 'ok') {
    return (
      <svg {...common}><circle cx="8" cy="8" r="6.2" /><path d="M5 8.2l2 2 4-4.2" /></svg>
    );
  }
  if (state === 'revisar') {
    return (
      <svg {...common}><path d="M8 2.2L14.2 13H1.8z" /><path d="M8 6.5v3" /><path d="M8 11.3v.1" /></svg>
    );
  }
  return (
    <svg {...common}><circle cx="8" cy="8" r="6.2" strokeDasharray="2 2.2" /></svg>
  );
}

export interface GuideChipsProps {
  readonly status: GuideStatus;
  readonly locale: Locale;
  readonly label: string;
}

/**
 * Three status chips (focus, light, distance). Each shows a state word and an icon. These are not live regions:
 * the advice sentence is the only announcement, so screen readers are not flooded on every frame.
 */
export function GuideChips({ status, locale, label }: GuideChipsProps) {
  const table = copy[locale];
  return (
    <ul aria-label={label} className="pointer-events-none absolute inset-x-4 top-4 flex flex-wrap justify-center gap-2">
      {CHIPS.map(key => {
        const state = status[key];
        return (
          <li
            key={key}
            data-chip={key}
            data-state={state}
            className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1 text-xs text-white"
          >
            <ChipIcon state={state} />
            <span>{`${table[`chip.${key}`]}: ${table[`chip.state.${state}`]}`}</span>
          </li>
        );
      })}
    </ul>
  );
}
