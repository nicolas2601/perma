import { useEffect } from 'react';
import { Button, formatRawScore } from '@/ui';
import { useNavigate, useParams } from '@/app/router';
import { useI18n, useT } from '@/core/i18n/I18nProvider';
import { ActionDock, ExperimentalNotice, ScreenHeader } from './Chrome';
import { CLASS_INFO, isClassCode } from './classes';
import { useResultGuard } from './guards';

/** Class detail: name, code and the raw value on the shared scale. Route param is validated at the edge. */
export default function ClassDetailScreen() {
  const t = useT('inspect');
  const { locale } = useI18n();
  const navigate = useNavigate();
  const { clase = '' } = useParams();
  const result = useResultGuard();
  const valid = isClassCode(clase);
  useEffect(() => {
    if (!valid) navigate('/resultado/clases', { replace: true });
  }, [valid, navigate]);
  if (!result || !isClassCode(clase)) return null;
  const info = CLASS_INFO[clase];
  const name = info.name[locale];
  return (
    <main className="flex h-dvh flex-col bg-canvas">
      <ScreenHeader title={t('classDetailTitle')} backTo="/resultado/clases" backLabel={t('back')} infoLabel={t('info')} />
      <div tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
        <section className="flex flex-col gap-2">
          <h2 className="m-0 text-title text-ink">{t('classDefinitionHeading')}</h2>
          <p className="m-0 text-body text-ink">{t('classDetailIntro')}</p>
          <p className="m-0 text-label text-muted">{clase}</p>
          <p className="m-0 text-body-medium text-ink">{name}</p>
        </section>
        <section className="flex flex-col gap-1 rounded-tile border border-solid border-white/80 bg-surface p-4">
          <p className="m-0 text-title text-ink">{formatRawScore(result.scores[clase], locale)}</p>
          <p className="m-0 text-label text-muted">
            {result.source === 'mock' ? t('rawScoreMock') : t('rawScoreLive')}
          </p>
        </section>
        <section className="flex flex-col gap-2">
          <h3 className="m-0 text-section text-ink">{t('contextHeading')}</h3>
          <p className="m-0 text-body text-muted">{t('contextBody')}</p>
          <h3 className="m-0 text-section text-ink">{t('fullOutputHeading')}</h3>
          <p className="m-0 text-body text-muted">{t('fullOutputBody')}</p>
        </section>
        <ExperimentalNotice />
      </div>
      <ActionDock>
        <Button fullWidth variant="secondary" onClick={() => navigate('/resultado/clases')}>
          {t('classDetailBack')}
        </Button>
      </ActionDock>
    </main>
  );
}
