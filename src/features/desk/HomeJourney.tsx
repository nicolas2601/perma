import { useT } from '@/core/i18n/I18nProvider';
import { BookIcon, FileIcon, InfoIcon, LayersIcon, PlusIcon, ScanIcon } from '@/ui/icons';
import { Tile } from '@/ui/Tile';
import type { ReactNode } from 'react';
import type { Tint } from '@/ui/tints';

type Step = { key: string; tint: Tint; icon: ReactNode };

const STEPS: readonly Step[] = [
  { key: 'Contexto', tint: 'sky', icon: <PlusIcon /> },
  { key: 'Imagen', tint: 'mint', icon: <ScanIcon /> },
  { key: 'Analisis', tint: 'butter', icon: <LayersIcon /> },
  { key: 'Resultado', tint: 'lilac', icon: <InfoIcon /> },
  { key: 'Observaciones', tint: 'blush', icon: <BookIcon /> },
  { key: 'Revision', tint: 'mint', icon: <FileIcon /> },
];

/** Desktop-only overview of the six exam steps (the mobile app keeps its compact Home). */
export function HomeJourney() {
  const t = useT('desk');
  return (
    <section aria-labelledby="home-journey-title" className="hidden flex-col gap-4 lg:flex">
      <h2 id="home-journey-title" className="m-0 text-section text-ink">{t('homeJourneyTitle')}</h2>
      <ol className="m-0 grid list-none grid-cols-3 gap-4 p-0">
        {STEPS.map((step, index) => (
          <li key={step.key} className="flex">
            <div className="flex w-full flex-col gap-1">
              <p className="m-0 text-caption font-medium text-muted">{`${index + 1} / ${STEPS.length}`}</p>
              <Tile tint={step.tint} icon={step.icon} title={t(`step${step.key}`)} body={t(`homeStep${step.key}`)} />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
