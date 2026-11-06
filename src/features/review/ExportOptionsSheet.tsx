import { Sheet } from '@/ui';
import { useT } from './api';
import { copy } from './copy';

type ExportOptionsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/** Format choices. Only JSON is wired; PDF is listed as unavailable rather than faked. */
export function ExportOptionsSheet({ open, onOpenChange }: ExportOptionsSheetProps) {
  const t = useT(copy);
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('optionsTitle')}
      description={t('optionsIntro')}
      closeLabel={t('optionsClose')}
    >
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        <li className="flex flex-col gap-0.5 rounded-control border border-solid border-accent bg-surface p-3">
          <span className="text-body-medium text-ink">{t('optionJson')}</span>
          <span className="text-label text-muted">{t('optionJsonHint')}</span>
        </li>
        <li
          aria-disabled="true"
          className="flex flex-col gap-0.5 rounded-control border border-solid border-soft-line bg-disabled-surface p-3 text-disabled-text"
        >
          <span className="text-body-medium">{t('optionPdf')}</span>
          <span className="text-label">{t('optionPdfHint')}</span>
        </li>
      </ul>
    </Sheet>
  );
}
