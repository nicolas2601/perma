import { useState } from 'react';
import { Button, Sheet, StatusLine } from '@/ui';
import { useExamDispatch, useT } from './api';
import { copy } from './copy';
import { MAX_NOTE_LENGTH, noteAtLimit, normalizeNote } from './note';

type NotesSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  note: string;
};

type Feedback = { message: string; tone: 'info' | 'success' };

/** Professional note editor. The stored note is shown back immediately after saving. */
export function NotesSheet({ open, onOpenChange, note }: NotesSheetProps) {
  const t = useT(copy);
  const dispatch = useExamDispatch();
  const [draft, setDraft] = useState(note);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const save = () => {
    const next = normalizeNote(draft);
    dispatch({ type: 'NOTE_SET', note: next });
    setDraft(next);
    setFeedback({ message: next.length > 0 ? t('noteSaved') : t('noteCleared'), tone: 'success' });
  };
  const clear = () => {
    dispatch({ type: 'NOTE_SET', note: '' });
    setDraft('');
    setFeedback({ message: t('noteCleared'), tone: 'success' });
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange} title={t('noteTitle')} description={t('noteHint')} closeLabel={t('noteClose')}>
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5 text-label text-ink">
          {t('noteLabel')}
          <textarea
            value={draft}
            maxLength={MAX_NOTE_LENGTH}
            rows={5}
            onChange={(event) => setDraft(event.target.value)}
            className="w-full resize-y rounded-control border border-solid border-line bg-surface p-3 text-body text-ink outline-offset-2"
          />
        </label>
        {noteAtLimit(draft) ? <StatusLine message={t('noteLimit')} tone="info" /> : null}
        <div className="flex flex-col gap-2 rounded-tile bg-subtle p-3">
          <span className="text-caption text-muted">{t('noteCurrent')}</span>
          <p className="m-0 text-body text-ink">{note.length > 0 ? note : t('noteNone')}</p>
        </div>
        <StatusLine message={feedback?.message ?? null} tone={feedback?.tone ?? 'info'} />
        <div className="flex gap-2">
          <Button variant="secondary" className="flex-1" onClick={clear}>
            {t('noteClear')}
          </Button>
          <Button className="flex-1" onClick={save}>
            {t('noteSave')}
          </Button>
        </div>
      </div>
    </Sheet>
  );
}
