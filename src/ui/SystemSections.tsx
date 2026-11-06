import type { ReactNode } from 'react';
import { AccordionList, AccordionRow } from './AccordionRow';
import { Badge } from './Badge';
import { Button, type ButtonVariant } from './Button';
import { Card } from './Card';
import { FileDrop } from './FileDrop';
import { FloatingNav, type NavItem } from './FloatingNav';
import { BookIcon, FileIcon, HomeIcon, ScanIcon } from './icons';
import { IconButton } from './IconButton';
import { ScoreRow, type ScoreLocale } from './ScoreRow';
import { Sheet } from './Sheet';
import { StatusLine, type StatusTone } from './StatusLine';
import { Tabs, type TabItem } from './Tabs';
import type { SystemCopy } from './systemCopy';

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="m-0 text-section text-ink">{title}</h2>
      {children}
    </section>
  );
}

const VARIANTS: readonly ButtonVariant[] = ['primary', 'secondary', 'quiet', 'danger'];

export function ButtonSpecimens({ copy }: { copy: SystemCopy }) {
  return (
    <div className="flex flex-col gap-4">
      {VARIANTS.map((variant) => (
        <div key={variant} className="flex flex-col gap-2">
          <span className="text-caption text-muted">{copy.variants[variant]}</span>
          <div className="flex flex-wrap gap-2">
            <Button variant={variant}>{copy.states.default}</Button>
            <Button variant={variant} pressed>
              {copy.states.pressed}
            </Button>
            <Button variant={variant} disabled>
              {copy.states.disabled}
            </Button>
            <Button variant={variant} loading>
              {copy.states.loading}
            </Button>
          </div>
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-2">
        <IconButton label={copy.iconLabel} icon={<ScanIcon className="size-5" />} />
        <IconButton label={copy.iconLabel} icon={<ScanIcon className="size-5" />} pressed />
        <IconButton label={copy.iconLabel} icon={<ScanIcon className="size-5" />} disabled />
        <Button variant="secondary" className="outline-2 outline-offset-2 outline-accent">
          {copy.focusDemo}
        </Button>
        <Badge tone="simulated">{copy.badgeSimulated}</Badge>
      </div>
    </div>
  );
}

export function CardSpecimens({ copy }: { copy: SystemCopy }) {
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <h3 className="m-0 text-section text-ink">{copy.bentoTitle}</h3>
        <p className="m-0 text-label text-muted">{copy.bentoBody}</p>
        <Button fullWidth>{copy.sectionCards}</Button>
      </Card>
      <div className="flex gap-3">
        <Card tone="subtle" className="w-32 shrink-0">
          <BookIcon className="size-5" />
          <p className="m-0 text-body text-ink">{copy.protocolTitle}</p>
          <p className="m-0 text-caption text-muted">{copy.protocolBody}</p>
        </Card>
        <Card tone="ink" className="flex-1 text-body">
          {copy.bentoBody}
        </Card>
      </div>
    </div>
  );
}

export function TabsSpecimen({
  copy,
  value,
  onValueChange,
}: {
  copy: SystemCopy;
  value: string;
  onValueChange: (value: string) => void;
}) {
  const items: TabItem[] = [
    { value: 'image', label: copy.tabs.image, panel: <p className="m-0 text-body text-ink">{copy.tabImageBody}</p> },
    { value: 'model', label: copy.tabs.model, panel: <p className="m-0 text-body text-ink">{copy.tabModelBody}</p> },
    { value: 'notes', label: copy.tabs.notes, panel: <p className="m-0 text-body text-ink">{copy.tabNotesBody}</p> },
  ];
  return <Tabs items={items} value={value} onValueChange={onValueChange} label={copy.tabsLabel} />;
}

export function AccordionSpecimen({
  copy,
  value,
  onValueChange,
}: {
  copy: SystemCopy;
  value: string[];
  onValueChange: (value: string[]) => void;
}) {
  return (
    <AccordionList label={copy.abcdeLabel} value={value} onValueChange={onValueChange}>
      {copy.criteria.map((criterion) => (
        <AccordionRow
          key={criterion.letter}
          value={criterion.letter}
          letter={criterion.letter}
          title={criterion.title}
          status={copy.abcdeStatus}
        >
          <p className="m-0 text-label text-muted">{copy.abcdeStatus}</p>
        </AccordionRow>
      ))}
    </AccordionList>
  );
}

export function SheetSpecimen({
  copy,
  open,
  onOpenChange,
}: {
  copy: SystemCopy;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <>
      <Button variant="secondary" onClick={() => onOpenChange(true)}>
        {copy.openSheet}
      </Button>
      <Sheet open={open} onOpenChange={onOpenChange} title={copy.sheetTitle} closeLabel={copy.closeSheet}>
        <p className="m-0 text-body text-ink">{copy.sheetBody}</p>
      </Sheet>
    </>
  );
}

export function NavSpecimen({
  copy,
  currentId,
  onNavigate,
}: {
  copy: SystemCopy;
  currentId: string;
  onNavigate: (id: string) => void;
}) {
  const items: NavItem[] = [
    { id: 'escritorio', label: copy.navItems.escritorio, icon: <HomeIcon /> },
    { id: 'examinar', label: copy.navItems.examinar, icon: <ScanIcon /> },
    { id: 'revision', label: copy.navItems.revision, icon: <FileIcon /> },
    { id: 'guia', label: copy.navItems.guia, icon: <BookIcon /> },
  ];
  return <FloatingNav items={items} currentId={currentId} onNavigate={onNavigate} label={copy.navLabel} />;
}

const DEMO_SCORES = [0.12, 0.47, 0.83] as const;

export function ScoreSpecimen({ copy, locale }: { copy: SystemCopy; locale: ScoreLocale }) {
  return (
    <div className="flex flex-col gap-4">
      <Badge tone="simulated">{copy.badgeSimulated}</Badge>
      {DEMO_SCORES.map((score, index) => (
        <ScoreRow key={score} label={copy.scoreLabel(index + 1)} score={score} locale={locale} />
      ))}
      <span className="text-caption text-muted">{copy.scoreAxis}</span>
    </div>
  );
}

export function FeedbackSpecimen({
  copy,
  status,
  tone,
  onDemo,
  receivedCount,
  onFiles,
}: {
  copy: SystemCopy;
  status: string | null;
  tone: StatusTone;
  onDemo: () => void;
  receivedCount: number;
  onFiles: (files: File[]) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <Button variant="secondary" onClick={onDemo}>
        {copy.statusDemo}
      </Button>
      <StatusLine message={status} tone={tone} />
      <FileDrop
        label={copy.dropLabel}
        hint={copy.dropHint}
        buttonLabel={copy.dropButton}
        accept="image/*"
        onFiles={onFiles}
      />
      <span className="text-caption text-muted">{receivedCount > 0 ? copy.dropReceived(receivedCount) : null}</span>
    </div>
  );
}
