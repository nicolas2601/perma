import { Button } from '@/ui';
import { useNavigate } from '@/app/router';
import { ActionDock, ScreenHeader } from '@/features/inspect/Chrome';
import { copy as inspectCopy } from '@/features/inspect/copy';
import { useT } from './api';
import { copy } from './copy';
import { calibrationCopy } from './calibrationCopy';

/** Calibration guidance (Figma 141:3455). This prototype does not calibrate photographs. */
export default function CalibrationScreen() {
  const t = useT(calibrationCopy);
  const tCommon = useT(copy);
  const tInspect = useT(inspectCopy);
  const navigate = useNavigate();
  return (
    <main className="flex min-h-dvh flex-col bg-canvas">
      <ScreenHeader
        title={t('title')}
        backTo="/examen/abcde"
        backLabel={tCommon('back')}
        infoLabel={tInspect('info')}
      />
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
        <h2 className="m-0 text-title text-ink">{t('heading')}</h2>
        <p className="m-0 text-body text-ink">{t('body')}</p>
        <section className="flex flex-col gap-1.5">
          <h3 className="m-0 text-section text-ink">{t('noRulerTitle')}</h3>
          <p className="m-0 text-body text-muted">{t('noRulerBody')}</p>
        </section>
        <section className="flex flex-col gap-1.5">
          <h3 className="m-0 text-section text-ink">{t('withoutTitle')}</h3>
          <p className="m-0 text-body text-muted">{t('withoutBody')}</p>
        </section>
      </div>
      <ActionDock>
        <Button fullWidth onClick={() => navigate('/examen/abcde?criterio=d')}>
          {t('action')}
        </Button>
      </ActionDock>
    </main>
  );
}
