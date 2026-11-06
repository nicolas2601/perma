import { useEffect } from 'react';
import { Button, ScoreRow } from '@/ui';
import { useNavigate, useParams } from '@/app/router';
import { useLocale, useT } from './api';
import { ActionDock, ExperimentalNotice, ScreenHeader } from './Chrome';
import { copy } from './copy';
import { CLASS_INFO, isClassCode } from './classes';
import { useResultGuard } from './guards';

/** Class detail: name, code and the raw value on the shared scale. Route param is validated at the edge. */
export default function ClassDetailScreen() {
  const t = useT(copy);
  const locale = useLocale();
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
    <main className="flex min-h-dvh flex-col bg-canvas">
      <ScreenHeader title={t('classDetailTitle')} backTo="/resultado/clases" backLabel={t('back')} infoLabel={t('info')} />
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
        <h2 className="m-0 text-title text-ink">{name}</h2>
        <p className="m-0 text-label text-muted">{clase}</p>
        <p className="m-0 text-body text-ink">{t('classDetailIntro')}</p>
        <div className="rounded-tile border border-solid border-white/80 bg-surface p-4">
          <ScoreRow label={name} score={result.scores[clase]} locale={locale} />
        </div>
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
