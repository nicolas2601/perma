import type { ExamImage } from '@/core/exam/contract';
import { Sheet } from '@/ui';
import { useT } from '@/core/i18n/I18nProvider';
import { isReferenceImage } from './useImageSource';

export type ToolName = 'layers' | 'info';

type ToolSheetProps = {
  open: boolean;
  tool: ToolName;
  image: ExamImage | null;
  onOpenChange: (open: boolean) => void;
};

/** Layers and info for the viewer. There are no overlays to toggle: the image is unmodified. */
export function ToolSheet({ open, tool, image, onOpenChange }: ToolSheetProps) {
  const t = useT('inspect');
  const tCommon = t;
  const isLayers = tool === 'layers';
  const reference = isReferenceImage(image);
  const sourceText = reference ? t('referenceCaption') : (image?.name ?? '');
  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={isLayers ? t('toolSheetLayersTitle') : t('toolSheetInfoTitle')}
      description={t('toolSheetTitle')}
      closeLabel={tCommon('close')}
    >
      <div className="flex flex-col gap-3 text-body text-ink">
        <p className="m-0">{isLayers ? t('toolSheetLayersBody') : t('toolSheetInfoBody')}</p>
        {isLayers ? null : <p className="m-0 text-label text-muted">{sourceText}</p>}
      </div>
    </Sheet>
  );
}
