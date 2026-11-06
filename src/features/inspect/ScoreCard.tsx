import type { ClassCode } from '@/core/inference/types';
import { Link } from '@/app/router';
import { Card, ScoreRow, type ScoreLocale } from '@/ui';
import { CLASS_INFO } from './classes';

type ScoreCardProps = {
  code: ClassCode;
  score: number;
  locale: ScoreLocale;
  to: string;
};

/**
 * One raw score as a link to its class detail, on a raised white card. The meter shares the
 * 0-1 scale with every other row and stays neutral: no tint ever colours a score.
 * The link bleeds to the card edge (-m-4 / p-4) so the whole card is the tap target.
 */
export function ScoreCard({ code, score, locale, to }: ScoreCardProps) {
  const name = CLASS_INFO[code].name[locale];
  return (
    <Card variant="raised" interactive className="shrink-0">
      <Link to={to} className="-m-4 block p-4 outline-offset-2 focus-visible:-outline-offset-2">
        <ScoreRow label={`${name} (${code})`} score={score} locale={locale} />
      </Link>
    </Card>
  );
}
