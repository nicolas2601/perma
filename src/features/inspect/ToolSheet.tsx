import type { ReactNode } from 'react';
import type { ExamImage } from '@/core/exam/contract';
import { Button, PHASE_TINT, Sheet } from '@/ui';
import { useNavigate } from '@/app/router';
import { useT } from '@/core/i18n/I18nProvider';
import { ActionRow } from './ActionRow';
import { isReferenceImage } from './useImageSource';
import { ExpandIcon, InfoGlyphIcon, LayersIcon, PlusIcon } from './toolIcons';

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
            <ToolRow icon={<ExpandIcon />} title={t('toolFit')} hint={t('toolFitHint')} onClick={close} />
            <ToolRow icon={<PlusIcon />} title={t('toolZoom')} hint={t('toolZoomHint')} onClick={() => navigate(ZOOM_ROUTE)} />
            <ToolRow icon={<LayersIcon />} title={t('toolLayers')} hint={t('toolLayersHint')} onClick={() => onSelect('layers')} />
            <ToolRow icon={<InfoGlyphIcon />} title={t('toolInfo')} hint={t('toolInfoHint')} onClick={() => onSelect('info')} />
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

type ToolRowProps = { icon: ReactNode; title: string; hint: string; onClick: () => void };

/** Tool entry: raised white card with a blush icon blob (observation phase identity, not a large surface). */
function ToolRow({ icon, title, hint, onClick }: ToolRowProps) {
  return (
    <li>
      <ActionRow variant="raised" tint={PHASE_TINT.observaciones} icon={icon} title={title} hint={hint} onClick={onClick} />
    </li>
  );
}

