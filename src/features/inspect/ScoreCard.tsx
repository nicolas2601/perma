import type { ClassCode } from '@/core/inference/types';
import { Link } from '@/app/router';
import { ScoreRow, type ScoreLocale } from '@/ui';
import { CLASS_INFO } from './classes';

type ScoreCardProps = {
  code: ClassCode;
  score: number;
  locale: ScoreLocale;
  to: string;
};

/**
 * One raw score as a link to its class detail. The meter shares the 0-1 scale with
 * every other row; the visible label carries the class code for disambiguation.
 */
export function ScoreCard({ code, score, locale, to }: ScoreCardProps) {
  const name = CLASS_INFO[code].name[locale];
  return (
    <Link
      to={to}
      className="block rounded-tile border border-solid border-white/80 bg-surface p-3.5 text-left outline-offset-2 active:scale-[0.97] transition-transform duration-(--motion-press) ease-out motion-reduce:transition-none"
    >
      <ScoreRow label={`${name} (${code})`} score={score} locale={locale} />
    </Link>
  );
}
