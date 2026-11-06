import { Sheet, cx } from '@/ui';
import type { ExportFormat } from '@/core/export/types';
import { useT } from '@/core/i18n/I18nProvider';
import { usePressScale } from '@/motion';
import { motion } from 'motion/react';

type ExportOptionsSheetProps = {
  open: boolean;
  format: ExportFormat;
  onFormatChange: (format: ExportFormat) => void;
  onOpenChange: (open: boolean) => void;
};

const FORMATS: readonly ExportFormat[] = ['json', 'pdf'];
const OPTION_KEYS: Record<ExportFormat, { label: string; hint: string }> = {
  json: { label: 'optionJson', hint: 'optionJsonHint' },
  pdf: { label: 'optionPdf', hint: 'optionPdfHint' },
};

/** Format choice. Both JSON and PDF are real exports; the chosen one is used by the export button. */
export function ExportOptionsSheet({ open, format, onFormatChange, onOpenChange }: ExportOptionsSheetProps) {
  const t = useT('review');
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('optionsTitle')}
      description={t('optionsIntro')}
      closeLabel={t('optionsClose')}
    >
      <div role="radiogroup" aria-label={t('optionsTitle')} className="flex flex-col gap-2">
        {FORMATS.map((option) => (
          <FormatOption
            key={option}
            checked={option === format}
            label={t(OPTION_KEYS[option].label)}
            hint={t(OPTION_KEYS[option].hint)}
            selectedLabel={t('optionSelected')}
            onSelect={() => {
              onFormatChange(option);
              onOpenChange(false);
            }}
          />
        ))}
      </div>
    </Sheet>
  );
}

type FormatOptionProps = {
  checked: boolean;
  label: string;
  hint: string;
  selectedLabel: string;
  onSelect: () => void;
};

function FormatOption({ checked, label, hint, selectedLabel, onSelect }: FormatOptionProps) {
  const press = usePressScale(false);
  return (
    <motion.button
      type="button"
      role="radio"
      aria-checked={checked}
      onClick={onSelect}
      whileTap={press.whileTap}
      transition={press.transition}
      className={cx(
        'flex flex-col gap-0.5 rounded-control border border-solid bg-surface p-3 text-left outline-offset-2',
        checked ? 'border-accent' : 'border-line',
      )}
    >
      <span className="text-body-medium text-ink">{label}</span>
      <span className="text-label text-muted">{hint}</span>
      {checked ? <span className="text-caption text-accent">{selectedLabel}</span> : null}
    </motion.button>
  );
}
