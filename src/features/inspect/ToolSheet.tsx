import type { ExamImage } from '@/core/exam/contract';
import { Button, Sheet } from '@/ui';
import { useNavigate } from '@/app/router';
import { useT } from '@/core/i18n/I18nProvider';
import { isReferenceImage } from './useImageSource';

const ZOOM_ROUTE = '/inspeccion/zoom';

/** `menu` lists the four tools; `layers` and `info` show their explanation. */
export type ToolName = 'menu' | 'layers' | 'info';

type ToolSheetProps = {
  open: boolean;
  tool: ToolName;
  image: ExamImage | null;
  onOpenChange: (open: boolean) => void;
  onSelect: (tool: ToolName) => void;
};

/** Image tools sheet ("Herramientas de imagen"). There are no overlays to toggle: the image is unmodified. */
export function ToolSheet({ open, tool, image, onOpenChange, onSelect }: ToolSheetProps) {
  const t = useT('inspect');
  const navigate = useNavigate();
  const close = () => onOpenChange(false);
  const title = titleFor(tool, t);
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={title} description={t('toolSheetIntro')} closeLabel={t('close')}>
      {tool === 'menu' ? (
        <div className="flex flex-col gap-2.5 text-ink">
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            <ToolRow title={t('toolFit')} hint={t('toolFitHint')} onClick={close} />
            <ToolRow title={t('toolZoom')} hint={t('toolZoomHint')} onClick={() => navigate(ZOOM_ROUTE)} />
            <ToolRow title={t('toolLayers')} hint={t('toolLayersHint')} onClick={() => onSelect('layers')} />
            <ToolRow title={t('toolInfo')} hint={t('toolInfoHint')} onClick={() => onSelect('info')} />
          </ul>
          <Button fullWidth variant="secondary" onClick={close}>
            {t('backToImage')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3 text-body text-ink">
          <p className="m-0">{tool === 'layers' ? t('toolSheetLayersBody') : t('toolSheetInfoBody')}</p>
          {tool === 'info' ? <p className="m-0 text-label text-muted">{sourceText(image, t)}</p> : null}
          <Button fullWidth variant="secondary" onClick={() => onSelect('menu')}>
            {t('backToTools')}
          </Button>
        </div>
      )}
    </Sheet>
  );
}

function titleFor(tool: ToolName, t: (key: string) => string): string {
  if (tool === 'layers') return t('toolSheetLayersTitle');
  if (tool === 'info') return t('toolSheetInfoTitle');
  return t('toolSheetTitle');
}

function sourceText(image: ExamImage | null, t: (key: string) => string): string {
  return isReferenceImage(image) ? t('referenceCaption') : (image?.name ?? '');
}

function ToolRow({ title, hint, onClick }: { title: string; hint: string; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-14 w-full flex-col gap-0.5 rounded-tile border border-solid border-line bg-surface p-4 text-left outline-offset-2"
      >
        <span className="text-body-medium text-ink">{title}</span>
        <span className="text-label text-muted">{hint}</span>
      </button>
    </li>
  );
}

