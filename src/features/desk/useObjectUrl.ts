import { useEffect, useState } from 'react';

interface Entry {
  blob: Blob;
  url: string;
}

/**
 * Object URL for a blob, revoked on change or unmount. The URL is only returned for
 * the blob it was created from, so a stale preview is never shown. StrictMode-safe:
 * a cancelled run never publishes its URL.
 */
export function useObjectUrl(blob: Blob | null): string | null {
  const [entry, setEntry] = useState<Entry | null>(null);
  useEffect(() => {
    if (!blob) return undefined;
    let cancelled = false;
    const url = URL.createObjectURL(blob);
    queueMicrotask(() => {
      if (!cancelled) setEntry({ blob, url });
    });
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [blob]);
  return entry !== null && entry.blob === blob ? entry.url : null;
}
