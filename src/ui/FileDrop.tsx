import { useRef, useState, type DragEvent } from 'react';
import { Button } from './Button';
import { cx } from './cx';

export type FileDropProps = {
  label: string;
  hint: string;
  buttonLabel: string;
  accept?: string;
  multiple?: boolean;
  disabled?: boolean;
  onFiles: (files: File[]) => void;
};

/** Drop zone plus a keyboard-reachable picker. The button is the real control; dragging is a shortcut. */
export function FileDrop({ label, hint, buttonLabel, accept, multiple = false, disabled = false, onFiles }: FileDropProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const emit = (list: FileList | null) => {
    if (disabled || !list || list.length === 0) return;
    onFiles(Array.from(list));
  };

  const onDragOver = (event: DragEvent<HTMLElement>) => {
    if (disabled) return;
    event.preventDefault();
    setDragging(true);
  };

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    emit(event.dataTransfer.files);
  };

  return (
    <section
      aria-label={label}
      data-dragging={dragging || undefined}
      onDragOver={onDragOver}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cx(
        'flex min-h-32 flex-col items-center justify-center gap-2 rounded-tile border border-dashed border-line bg-surface p-4 text-center',
        dragging && 'bg-subtle',
        disabled && 'opacity-60',
      )}
    >
      <p className="m-0 text-body-medium text-ink">{label}</p>
      <p className="m-0 text-caption text-muted">{hint}</p>
      <Button variant="secondary" disabled={disabled} onClick={() => inputRef.current?.click()}>
        {buttonLabel}
      </Button>
      <input
        ref={inputRef}
        type="file"
        hidden
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(event) => {
          emit(event.currentTarget.files);
          event.currentTarget.value = '';
        }}
      />
    </section>
  );
}
