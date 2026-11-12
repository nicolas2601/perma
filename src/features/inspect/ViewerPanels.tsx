import type { ReactNode } from 'react';
import { Button, cx } from '@/ui';
import { Link, useNavigate } from '@/app/router';
import type { ExamImage } from '@/core/exam/contract';
import type { InferenceResult } from '@/core/inference/types';
import type { ExamRecord } from '@/core/storage/types';
import type { Locale } from '@/core/i18n/contract';
import { useT } from '@/core/i18n/I18nProvider';
import { CRITERIA, answeredCount, criterionValue } from '@/features/abcde/logic';
import { CRITERION_TITLE_KEY, optionKey } from '@/features/abcde/copy';
import { ExperimentalNotice } from './Chrome';
import { rankClasses } from './classes';
import { ScoreCard } from './ScoreCard';
import { isReferenceImage, PUBLIC_REFERENCE_URL } from './useImageSource';
import { ExpandIcon, InfoGlyphIcon, LayersIcon, PlusIcon } from './toolIcons';
import { Tile } from './Tile';
import { ContourLayer } from './explain/ContourOverlay';

type ToolName = 'layers' | 'info';

type ImageFigureProps = {
  src: string | null;
  reference: boolean;
  className?: string;
  /** Desktop height of the picture; the mobile height is fixed. */
  imageClassName?: string;
  /** Optional layer drawn above the unaltered picture (the model contour). */
  overlay?: ReactNode;
};

const DESKTOP_IMAGE_HEIGHT = 'lg:h-[70dvh]';

/** The original image, unmodified (no mask, no heatmap, no filter). Shared by the mobile tab and the desktop stage. */
export function ImageFigure({ src, reference, className, imageClassName = DESKTOP_IMAGE_HEIGHT, overlay }: ImageFigureProps) {
  const t = useT('inspect');
  const shown = src ?? (reference ? PUBLIC_REFERENCE_URL : null);
  return (
    <figure className={cx('m-0 flex flex-col overflow-hidden rounded-tile bg-surface lg:bg-subtle', className)}>
      {shown ? (
        <div className={cx('relative h-65 w-full', imageClassName)}>
          <img
            src={shown}
            alt={reference ? t('imageAltReference') : t('imageAltSession')}
            decoding="async"
            className="block h-full w-full object-contain"
          />
          {overlay}
        </div>
      ) : (
        <p className="m-0 p-4 text-label text-muted">{t('unavailableImage')}</p>
      )}
      {reference && shown ? (
        <figcaption className="flex flex-col gap-0.5 border-t border-solid border-soft-line px-3.5 py-2 text-caption text-ink">
          <span>{t('referenceCaption')}</span>
          <span className="text-muted">{t('referenceAttribution')}</span>
        </figcaption>
      ) : null}
    </figure>
  );
}

type ImageToolbarProps = {
  onOpenTool: (tool: ToolName) => void;
  className?: string;
};

/** Floating tools under the image: Ajustar, Ampliar, Capas, Info. */
export function ImageToolbar({ onOpenTool, className }: ImageToolbarProps) {
  const t = useT('inspect');
  const navigate = useNavigate();
  return (
    <div role="group" aria-label={t('toolbarLabel')} className={cx('grid grid-cols-4 gap-1.5 rounded-nav bg-surface p-1.5', className)}>
      <Button variant="quiet" pressed aria-pressed="true" className="flex-col">
        <ExpandIcon />
        <span className="text-header">{t('toolFit')}</span>
      </Button>
      <Button variant="quiet" onClick={() => navigate('/inspeccion/zoom')} className="flex-col">
        <PlusIcon />
        <span className="text-header">{t('toolZoom')}</span>
      </Button>
      <Button variant="quiet" onClick={() => onOpenTool('layers')} className="flex-col">
        <LayersIcon />
        <span className="text-header">{t('toolLayers')}</span>
      </Button>
      <Button variant="quiet" onClick={() => onOpenTool('info')} className="flex-col">
        <InfoGlyphIcon />
        <span className="text-header">{t('toolInfo')}</span>
      </Button>
    </div>
  );
}

type ViewerStageProps = {
  src: string | null;
  image: ExamImage | null;
  result: InferenceResult;
  onOpenTool: (tool: ToolName) => void;
};

/** Desktop only (lg): the image stays on the left whatever tab is open, with its tools under it. */
export function ViewerStage({ src, image, result, onOpenTool }: ViewerStageProps) {
  return (
    <div className="hidden lg:sticky lg:top-6 lg:flex lg:flex-col lg:gap-3 lg:self-start">
      <ImageFigure src={src} reference={isReferenceImage(image)} overlay={<ContourLayer result={result} />} />
      <ImageToolbar onOpenTool={onOpenTool} />
    </div>
  );
}

type ImagePanelProps = {
  src: string | null;
  image: ExamImage | null;
  record: ExamRecord;
  result: InferenceResult;
  onOpenTool: (tool: ToolName) => void;
};

/** Unmodified image plus the floating tools (mobile). On desktop the stage shows them instead. */
export function ImagePanel({ src, image, record, result, onOpenTool }: ImagePanelProps) {
  const t = useT('inspect');
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-3">
      <h2 className="m-0 text-title text-ink">{t('imageHeading')}</h2>
      <ImageFigure src={src} reference={isReferenceImage(image)} className="lg:hidden" overlay={<ContourLayer result={result} />} />
      <ImageToolbar onOpenTool={onOpenTool} className="lg:hidden" />
      <div className="grid grid-cols-[1fr_7rem] gap-3">
        <div className="flex flex-col gap-3 rounded-tile bg-ink p-3 text-on-accent">
          <p className="m-0 text-body text-on-accent">{t('manualInvitation')}</p>
          <Button fullWidth onClick={() => navigate('/examen/abcde')}>
            {t('registerAbcde')}
          </Button>
        </div>
        <Tile label={t('reviewStatus')} value={statusLabel(record, t)} />
      </div>
    </div>
  );
}

function statusLabel(record: ExamRecord, t: (key: string) => string): string {
  const count = answeredCount(record);
  if (count === 0) return t('statusNone');
  if (count === CRITERIA.length) return t('statusDone');
  return t('statusPartial');
}

export function OutputPanel({ result, locale }: { result: InferenceResult; locale: Locale }) {
  const t = useT('inspect');
  return (
    <div className="flex flex-col gap-3">
      <h2 className="m-0 text-title text-ink">{t('outputTitle')}</h2>
      <ExperimentalNotice />
      <ul aria-label={t('outputTitle')} className="m-0 flex list-none flex-col gap-3 p-0">
        {rankClasses(result.scores).slice(0, 3).map((code) => (
          <li key={code}>
            <ScoreCard code={code} score={result.scores[code]} locale={locale} to="/resultado/clases" />
          </li>
        ))}
      </ul>
      <Link to="/resultado" className="inline-flex min-h-11 items-center text-label text-accent outline-offset-2">
        {t('viewAllScores')}
      </Link>
    </div>
  );
}

export function ObservationsPanel({ record }: { record: ExamRecord }) {
  const t = useT('inspect');
  const tAbcde = useT('abcde');
  const navigate = useNavigate();
  return (
    <div className="flex flex-col gap-3">
      <h2 className="m-0 text-title text-ink">{t('observationsTitle')}</h2>
      <p className="m-0 text-label text-muted">{t('observationsIntro')}</p>
      <ul aria-label={t('observationsTitle')} className="m-0 flex list-none flex-col gap-2 p-0">
        {CRITERIA.map((criterion) => {
          const value = criterionValue(record, criterion);
          return (
            <li key={criterion} className="flex items-center gap-2.5 rounded-control bg-surface px-3 py-2.5">
              <span className="text-body-medium text-accent">{criterion}</span>
              <span className="min-w-0 flex-1 text-label text-ink">{tAbcde(CRITERION_TITLE_KEY[criterion])}</span>
              <span className="text-label text-muted">
                {value === null ? tAbcde('unanswered') : tAbcde(optionKey(criterion, value))}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="m-0 text-label text-muted">{t('notePreviewLabel')}</p>
      <p className="m-0 text-body text-ink">{record.note.length > 0 ? record.note : t('noNote')}</p>
      <Button fullWidth variant="secondary" onClick={() => navigate('/examen/abcde')}>
        {t('editAbcde')}
      </Button>
    </div>
  );
}
