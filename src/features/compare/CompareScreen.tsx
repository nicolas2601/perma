import { useState } from 'react';
import { Button, Card, Chip, PHASE_TINT } from '@/ui';
import { useNavigate } from '@/app/router';
import { useExam } from '@/core/exam/react';
import { useT } from '@/core/i18n/I18nProvider';
import { ActionDock, ScreenHeader } from '@/features/inspect/Chrome';
import { ActionRow } from '@/features/inspect/ActionRow';
import { useFlowSync } from '@/features/inspect/flowSync';
import { LayersIcon } from '@/features/inspect/toolIcons';
import { NotesSheet } from './NotesSheet';

const OBSERVATION_TINT = PHASE_TINT.observaciones;

/** Compare with context. Comparison stays unavailable until a real earlier source exists. */
export default function CompareScreen() {
  const t = useT('compare');
  const tInspect = useT('inspect');
  const navigate = useNavigate();
  const record = useExam((state) => state.record);
  useFlowSync('compare');
  const [noteOpen, setNoteOpen] = useState(false);
  const hasNote = record.note.length > 0;
  return (
    <main className="flex h-dvh flex-col bg-canvas">
      <ScreenHeader
        title={t('compareTitle')}
        backTo="/examen/abcde"
        backLabel={t('back')}
        infoLabel={tInspect('info')}
      />
      <div tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto overscroll-contain px-5 pb-5 pt-3">
        <section className="flex flex-col items-start gap-2.5">
          <Chip tint={OBSERVATION_TINT}>{tInspect('stepObservations')}</Chip>
          <h2 className="m-0 text-title text-ink">{t('compareHeading')}</h2>
          <p className="m-0 text-body text-ink">{t('compareBody')}</p>
        </section>
        <section className="flex flex-col gap-1.5">
          <h3 className="m-0 text-section text-ink">{t('requiredTitle')}</h3>
          <p className="m-0 text-body text-muted">{t('requiredBody')}</p>
        </section>
        <section className="flex flex-col gap-1.5">
          <h3 className="m-0 text-section text-ink">{t('notInferredTitle')}</h3>
          <p className="m-0 text-body text-muted">{t('notInferredBody')}</p>
        </section>
        <ActionRow
          variant="raised"
          tint={OBSERVATION_TINT}
          icon={<LayersIcon />}
          title={t('priorCardTitle')}
          hint={t('priorCardBody')}
          onClick={() => navigate('/examen/previo')}
        />
        <Card as="section" variant="raised" className="shrink-0">
          <h3 className="m-0 text-body-medium text-ink">{t('noteTitle')}</h3>
          <p className="m-0 text-caption text-muted">{t('noteCurrent')}</p>
          <p className="m-0 text-body text-ink">{hasNote ? record.note : t('noteNone')}</p>
          <Button variant="secondary" onClick={() => setNoteOpen(true)}>
            {hasNote ? t('noteEdit') : t('noteAdd')}
          </Button>
        </Card>
      </div>
      <ActionDock>
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={() => navigate('/examen/abcde')}>
            {t('dockBack')}
          </Button>
          <Button className="flex-1" onClick={() => navigate('/revision')}>
            {t('dockNext')}
          </Button>
        </div>
      </ActionDock>
      <NotesSheet open={noteOpen} onOpenChange={setNoteOpen} note={record.note} />
    </main>
  );
}
