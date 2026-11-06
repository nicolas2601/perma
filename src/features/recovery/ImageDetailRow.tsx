import { useState } from 'react';

export interface ImageDetailRowProps {
  title: string;
  hint: string;
  fileLabel: string;
  fileName: string;
}

/** Expandable row (Figma 141:2768): reveals only data the record already holds (the file name). */
export function ImageDetailRow({ title, hint, fileLabel, fileName }: ImageDetailRowProps) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col overflow-hidden rounded-card bg-surface shadow-raised">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-14 w-full flex-col items-start justify-center gap-1 px-4 py-3 text-left text-ink outline-offset-2"
      >
        <span className="text-body text-ink">{title}</span>
        <span className="text-caption text-muted">{hint}</span>
      </button>
      {open ? (
        <p className="m-0 bg-subtle px-4 py-3 text-label text-muted">
          {fileLabel}: {fileName}
        </p>
      ) : null}
    </div>
  );
}
