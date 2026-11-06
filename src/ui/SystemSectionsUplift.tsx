import { useState, type ComponentType } from 'react';
import { Button } from './Button';
import { Card } from './Card';
import { Chip } from './Chip';
import { DrawCheck } from './DrawCheck';
import { EmptyState } from './EmptyState';
import { IconBlob } from './IconBlob';
import { BookIcon, FileIcon, HomeIcon, ScanIcon } from './icons';
import { SectionHeading } from './SectionHeading';
import { Stepper, type StepDef } from './Stepper';
import { Tile } from './Tile';
import { PHASE_TINT, TINTS, type Tint } from './tints';
import type { SystemCopy } from './systemCopy';

const STEP_IDS = ['contexto', 'imagen', 'analisis', 'resultado', 'observaciones', 'revision'] as const;
type StepId = (typeof STEP_IDS)[number];

type IconComponent = ComponentType<{ className?: string }>;

const TILE_ICON: Record<Tint, IconComponent> = {
  sky: HomeIcon,
  mint: ScanIcon,
  butter: FileIcon,
  lilac: BookIcon,
  blush: ScanIcon,
};

const PHASE_TILES: readonly { id: StepId; tint: Tint }[] = [
  { id: 'contexto', tint: 'sky' },
  { id: 'imagen', tint: 'mint' },
  { id: 'analisis', tint: 'butter' },
  { id: 'resultado', tint: 'lilac' },
];

export function ChipSpecimens({ copy }: { copy: SystemCopy }) {
  const [selected, setSelected] = useState<Tint>('mint');
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-2">
        {TINTS.map((tint) => (
          <Chip key={tint} tint={tint}>
            {copy.uplift.tintNames[tint]}
          </Chip>
        ))}
        <Chip>{copy.uplift.stepLabels.revision}</Chip>
      </div>
      <div className="flex flex-wrap gap-2">
        {TINTS.map((tint) => (
          <Chip key={tint} tint={tint} selected={selected === tint} onClick={() => setSelected(tint)}>
            {copy.uplift.tintNames[tint]}
          </Chip>
        ))}
      </div>
      <span className="text-caption text-muted">{copy.uplift.selectable}</span>
    </div>
  );
}

export function TileSpecimens({ copy }: { copy: SystemCopy }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <IconBlob tint="mint" size={40}>
          <ScanIcon />
        </IconBlob>
        <IconBlob tint="sky" size={48} label={copy.uplift.tintNames.sky}>
          <HomeIcon />
        </IconBlob>
        <IconBlob tint="lilac" size={48}>
          <BookIcon />
        </IconBlob>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {PHASE_TILES.map(({ id, tint }) => {
          const Icon = TILE_ICON[tint];
          return (
            <Tile
              key={id}
              tint={tint}
              icon={<Icon />}
              title={copy.uplift.stepLabels[id]}
              body={copy.uplift.tileBody}
            />
          );
        })}
      </div>
    </div>
  );
}

function stepDefs(copy: SystemCopy): StepDef[] {
  return STEP_IDS.map((id) => ({ id, label: copy.uplift.stepLabels[id], tint: PHASE_TINT[id] }));
}

export function StepperSpecimen({ copy }: { copy: SystemCopy }) {
  const [current, setCurrent] = useState<StepId>('imagen');
  const steps = stepDefs(copy);
  return (
    <div className="flex flex-col gap-4">
      <Stepper steps={steps} currentId={current} label={copy.uplift.stepperLabel} onSelect={(id) => setCurrent(id as StepId)} />
      <Stepper steps={steps} currentId="analisis" label={copy.uplift.stepperLabel} />
    </div>
  );
}

export function HeadingSpecimen({ copy }: { copy: SystemCopy }) {
  return (
    <div className="flex flex-col gap-4">
      <SectionHeading eyebrow={copy.uplift.eyebrow} title={copy.uplift.headingTitle} tint="butter" />
      <SectionHeading title={copy.uplift.headingTitle} tint="lilac" as="h3" />
    </div>
  );
}

/** Demo-only geometric art. Real illustrations come from src/assets/illustrations later. */
function DemoArt() {
  return (
    <svg width="96" height="72" viewBox="0 0 96 72" aria-hidden="true">
      <rect x="6" y="14" width="56" height="44" rx="14" className="fill-tint-mint" />
      <circle cx="70" cy="22" r="14" className="fill-tint-butter" />
      <path d="M52 72A24 24 0 0 1 76 48V72Z" className="fill-tint-sky" />
    </svg>
  );
}

export function EmptySpecimen({ copy }: { copy: SystemCopy }) {
  return (
    <EmptyState
      art={<DemoArt />}
      title={copy.uplift.emptyTitle}
      body={copy.uplift.emptyBody}
      action={
        <Button variant="soft" tint="sky">
          {copy.uplift.emptyAction}
        </Button>
      }
    />
  );
}

export function DrawSpecimen({ copy }: { copy: SystemCopy }) {
  const [run, setRun] = useState(0);
  return (
    <div className="flex items-center gap-3">
      <DrawCheck key={run} label={copy.uplift.drawLabel} size={32} />
      <Button variant="secondary" onClick={() => setRun((count) => count + 1)}>
        {copy.uplift.replay}
      </Button>
    </div>
  );
}

export function CardVariantSpecimens({ copy }: { copy: SystemCopy }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Card variant="outline">
        <p className="m-0 text-body-medium text-ink">{copy.uplift.cardOutline}</p>
        <p className="m-0 text-label text-muted">{copy.uplift.tileBody}</p>
      </Card>
      <Card variant="soft" tint="butter">
        <p className="m-0 text-body-medium text-ink">{copy.uplift.cardSoft}</p>
        <p className="m-0 text-label text-muted">{copy.uplift.tileBody}</p>
      </Card>
      <Card variant="raised">
        <p className="m-0 text-body-medium text-ink">{copy.uplift.cardRaised}</p>
        <p className="m-0 text-label text-muted">{copy.uplift.tileBody}</p>
      </Card>
      <Card variant="raised" as="button" interactive className="text-left">
        <p className="m-0 text-body-medium text-ink">{copy.uplift.cardInteractive}</p>
        <p className="m-0 text-label text-muted">{copy.uplift.tileBody}</p>
      </Card>
    </div>
  );
}
