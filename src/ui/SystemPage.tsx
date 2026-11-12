import { useState } from 'react';
import { Notice } from './Notice';
import { SegmentedControl } from './SegmentedControl';
import {
  AccordionSpecimen,
  ButtonSpecimens,
  CardSpecimens,
  FeedbackSpecimen,
  NavSpecimen,
  ScoreSpecimen,
  Section,
  SheetSpecimen,
  TabsSpecimen,
} from './SystemSections';
import type { StatusTone } from './StatusLine';
import {
  CardVariantSpecimens,
  ChipSpecimens,
  DrawSpecimen,
  EmptySpecimen,
  HeadingSpecimen,
  StepperSpecimen,
  TileSpecimens,
} from './SystemSectionsUplift';
import { SYSTEM_COPY, type SystemLocale } from './systemCopy';

const LOCALE_OPTIONS = [
  { value: 'es', label: 'ES' },
  { value: 'en', label: 'EN' },
] as const satisfies readonly { value: SystemLocale; label: string }[];

const DEFAULT_TAB = 'image';
const DEFAULT_NAV = 'examinar';
const DEFAULT_CRITERIA = ['A'];

/** Internal kit page (mounted at /__system by the lead). Demo data only; nothing here is clinical output. */
export function SystemPage() {
  const [locale, setLocale] = useState<SystemLocale>('es');
  const [tab, setTab] = useState(DEFAULT_TAB);
  const [criteria, setCriteria] = useState<string[]>(DEFAULT_CRITERIA);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [nav, setNav] = useState(DEFAULT_NAV);
  const [status, setStatus] = useState<{ message: string | null; tone: StatusTone }>({ message: null, tone: 'info' });
  const [receivedCount, setReceivedCount] = useState(0);
  const copy = SYSTEM_COPY[locale];

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col gap-8 bg-canvas p-5 pb-24 text-ink md:max-w-[760px]">
      <header className="flex items-center justify-between gap-3">
        <h1 className="m-0 text-title text-ink">{copy.title}</h1>
        <SegmentedControl
          options={LOCALE_OPTIONS}
          value={locale}
          onValueChange={setLocale}
          label={copy.languageLabel}
        />
      </header>

      <Notice label={copy.noticeLabel}>{copy.notice}</Notice>

      <Section title={copy.sectionButtons}>
        <ButtonSpecimens copy={copy} />
      </Section>

      <Section title={copy.sectionCards}>
        <CardSpecimens copy={copy} />
      </Section>

      <Section title={copy.uplift.sectionCardVariants}>
        <CardVariantSpecimens copy={copy} />
      </Section>

      <Section title={copy.uplift.sectionTiles}>
        <TileSpecimens copy={copy} />
      </Section>

      <Section title={copy.uplift.sectionChips}>
        <ChipSpecimens copy={copy} />
      </Section>

      <Section title={copy.uplift.sectionHeadings}>
        <HeadingSpecimen copy={copy} />
      </Section>

      <Section title={copy.uplift.sectionStepper}>
        <StepperSpecimen copy={copy} />
      </Section>

      <Section title={copy.uplift.sectionEmpty}>
        <EmptySpecimen copy={copy} />
      </Section>

      <Section title={copy.uplift.sectionDraw}>
        <DrawSpecimen copy={copy} />
      </Section>

      <Section title={copy.sectionTabs}>
        <TabsSpecimen copy={copy} value={tab} onValueChange={setTab} />
      </Section>

      <Section title={copy.sectionAccordion}>
        <AccordionSpecimen copy={copy} value={criteria} onValueChange={setCriteria} />
      </Section>

      <Section title={copy.sectionSheet}>
        <SheetSpecimen copy={copy} open={sheetOpen} onOpenChange={setSheetOpen} />
      </Section>

      <Section title={copy.sectionNav}>
        <NavSpecimen copy={copy} currentId={nav} onNavigate={setNav} />
      </Section>

      <Section title={copy.sectionScores}>
        <ScoreSpecimen copy={copy} locale={locale} />
      </Section>

      <Section title={copy.sectionFeedback}>
        <FeedbackSpecimen
          copy={copy}
          status={status.message}
          tone={status.tone}
          onDemo={() => setStatus({ message: copy.statusDone, tone: 'success' })}
          receivedCount={receivedCount}
          onFiles={(files) => setReceivedCount(files.length)}
        />
      </Section>
    </main>
  );
}
