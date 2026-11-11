export const VIEWER_TABS = ['imagen', 'salida', 'observaciones', 'auditoria'] as const;
export type ViewerTab = (typeof VIEWER_TABS)[number];
const DEFAULT_TAB: ViewerTab = 'imagen';

/** Unknown or missing `tab` values fall back to the image view (edge validation). */
export function parseTab(raw: string | null): ViewerTab {
  return (VIEWER_TABS as readonly string[]).includes(raw ?? '') ? (raw as ViewerTab) : DEFAULT_TAB;
}
