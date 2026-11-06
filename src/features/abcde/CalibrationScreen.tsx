import { Button } from '@/ui';
import { useNavigate } from '@/app/router';
import { useT } from '@/core/i18n/I18nProvider';
import { ActionDock, ScreenHeader } from '@/features/inspect/Chrome';

/** Calibration guidance (Figma 141:3455). This prototype does not calibrate photographs. */
export default function CalibrationScreen() {
  const t = useT('abcde');
  const tInspect = useT('inspect');
  const navigate = useNavigate();
  return (
    <main className="flex h-dvh flex-col bg-canvas">
      <ScreenHeader
        title={t('calibrationTitle')}
        backTo="/examen/abcde"
        backLabel={t('back')}
        infoLabel={tInspect('info')}
      />
      <div tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
        <h2 className="m-0 text-title text-ink">{t('calibrationHeading')}</h2>
        <p className="m-0 text-body text-ink">{t('calibrationBody')}</p>
        <section className="flex flex-col gap-1.5">
          <h3 className="m-0 text-section text-ink">{t('calibrationNoRulerTitle')}</h3>
          <p className="m-0 text-body text-muted">{t('calibrationNoRulerBody')}</p>
        </section>
        <section className="flex flex-col gap-1.5">
          <h3 className="m-0 text-section text-ink">{t('calibrationWithoutTitle')}</h3>
          <p className="m-0 text-body text-muted">{t('calibrationWithoutBody')}</p>
        </section>
      </div>
      <ActionDock>
        <Button fullWidth onClick={() => navigate('/examen/abcde?criterio=d')}>
          {t('calibrationAction')}
        </Button>
      </ActionDock>
    </main>
  );
}
