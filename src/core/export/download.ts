const REVOKE_DELAY_MS = 4000;

/**
 * Triggers a browser download through a temporary anchor. Returns true when the
 * click was dispatched without throwing. The browser gives no completion signal,
 * so "triggered" is the strongest claim available here.
 */
export function triggerDownload(blob: Blob, filename: string): boolean {
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    return true;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
  }
}
