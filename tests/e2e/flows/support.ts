import { expect, type Locator, type Page } from '@playwright/test';

/** Visible Spanish copy used by the flow specs (ES is the default locale). */
export const COPY = {
  homeHeadline: 'Empiece con contexto.',
  newExam: 'Nuevo examen',
  contextHeadline: 'Dé contexto a la imagen.',
  continueToImage: 'Continuar a la imagen',
  captureHeadline: 'Muestre la imagen.',
  sampleCta: 'Usar ejemplo de referencia pública',
  qualityHeadline: 'Revise antes de enviar.',
  reviewSend: 'Revisar envío',
  consentHeadline: 'Revise antes de enviar.',
  consentLabel: 'Tengo autorización para enviar esta imagen.',
  sendCta: 'Enviar para análisis',
  stopWait: 'Detener espera',
  stopSheetConfirm: 'Volver a la revisión de imagen',
  stopConfirm: 'Detener',
  simulatedBadge: 'Modelo simulado',
  seeScores: 'Ver los siete puntajes',
  inspectImage: 'Inspeccionar la imagen',
  tabImage: 'Imagen',
  tabOutput: 'Salida del modelo',
  tabObservations: 'Mis observaciones',
  registerAbcde: 'Registrar en ABCDE',
  abcdeSummary: 'Ver resumen',
  compareNote: 'Escribir nota profesional',
  reviewSession: 'Revisar la sesión',
  exportPreview: 'Vista previa de exportación',
  exportAck: 'He revisado el contenido de este registro.',
  exportJson: 'Descargar tabla CSV',
  dismissBanner: 'Entendido',
} as const;

export const NOTICE_TEXT =
  'Prototipo experimental de investigación. Los puntajes no son probabilidades clínicas. No diagnostica.';

/** The PWA "offline-ready" banner sits over the bottom CTA on first load; dismiss it like a user would. */
export async function dismissOfflineBanner(page: Page): Promise<void> {
  const dismiss = page.getByRole('button', { name: COPY.dismissBanner });
  if (await dismiss.isVisible().catch(() => false)) await dismiss.click();
}

export async function openHome(page: Page, search = ''): Promise<void> {
  await page.goto(`/${search}`);
  await expect(page.getByRole('heading', { name: COPY.homeHeadline })).toBeVisible();
  await dismissOfflineBanner(page);
}

/** Home -> context -> capture. Leaves the app in phase `capturing` with the stage page visible. */
export async function toCapture(page: Page): Promise<void> {
  await page.getByRole('button', { name: COPY.newExam }).click();
  await expect(page.getByRole('heading', { name: COPY.contextHeadline })).toBeVisible();
  await page.getByRole('button', { name: COPY.continueToImage }).click();
  await expect(page.getByRole('heading', { name: COPY.captureHeadline })).toBeVisible();
}

/** Capture -> quality with the public reference sample. */
export async function chooseSample(page: Page): Promise<void> {
  await page.getByRole('button', { name: COPY.sampleCta }).click();
  await expect(page).toHaveURL(/\/imagen\/calidad$/);
  await expect(page.getByRole('heading', { name: COPY.qualityHeadline })).toBeVisible();
}

/** Quality -> consent, then ticks the required consent checkbox. */
export async function toConsentChecked(page: Page): Promise<void> {
  await page.getByRole('button', { name: COPY.reviewSend }).click();
  await expect(page.getByRole('heading', { name: COPY.consentHeadline })).toBeVisible();
  await page.getByRole('checkbox', { name: COPY.consentLabel }).check();
}

/** Full happy path to the result screen (mock build, success scenario). */
export async function runToResult(page: Page): Promise<void> {
  await openHome(page);
  await toCapture(page);
  await chooseSample(page);
  await toConsentChecked(page);
  await page.getByRole('button', { name: COPY.sendCta }).click();
  await expect(page).toHaveURL(/\/resultado$/, { timeout: 30_000 });
}

/** Locator for the element that holds the image preview on a stage page. */
export function previewImage(page: Page): Locator {
  return page.locator('img[src^="blob:"]').first();
}

/** Result -> ABCDE -> set criterion A -> compare with a note -> review. */
export async function toReviewWithAbcde(page: Page, option = 'Asimétrica en un eje'): Promise<void> {
  await page.getByRole('button', { name: COPY.inspectImage }).click();
  await expect(page).toHaveURL(/\/inspeccion/);
  await dismissOfflineBanner(page);
  await page.getByRole('button', { name: COPY.registerAbcde }).click();
  await expect(page).toHaveURL(/\/examen\/abcde$/);
  await page.getByRole('button', { name: /^Asimetría/ }).first().click();
  await page.getByRole('radio', { name: option, exact: true }).click();
  await page.getByRole('button', { name: COPY.abcdeSummary }).click();
  await expect(page).toHaveURL(/\/examen\/comparar$/);
  await page.getByRole('button', { name: COPY.reviewSession }).click();
  await expect(page).toHaveURL(/\/revision$/);
}

/** Review -> export preview -> ticks the acknowledgement. */
export async function toExportChecked(page: Page): Promise<void> {
  await page.getByRole('button', { name: COPY.exportPreview }).click();
  await expect(page).toHaveURL(/\/revision\/exportar$/);
  await page.getByRole('checkbox', { name: COPY.exportAck }).check();
}

/** Sets `?mock=<scenario>` in place and fires popstate so the router re-renders (no reload, record kept). */
export async function setMockQuery(page: Page, scenario: string): Promise<void> {
  await page.evaluate((value) => {
    window.history.replaceState(null, '', `${window.location.pathname}?mock=${value}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, scenario);
}

/**
 * Uploads a generated JPEG through the real file input on the capture screen. JPEG is required for
 * reload persistence: non-JPEG originals are not persisted (src/core/exam/persistence.ts).
 */
export async function uploadJpeg(page: Page): Promise<void> {
  const bytes = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 480;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no 2d context');
    ctx.fillStyle = '#b98a6a';
    ctx.fillRect(0, 0, 640, 480);
    ctx.fillStyle = '#4a2c1d';
    ctx.beginPath();
    ctx.arc(320, 240, 120, 0, Math.PI * 2);
    ctx.fill();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    if (!blob) throw new Error('jpeg encode failed');
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  await page.locator('input[type="file"]').setInputFiles({ name: 'lesion-test.jpg', mimeType: 'image/jpeg', buffer: Buffer.from(bytes) });
  await expect(page).toHaveURL(/\/imagen\/calidad$/);
}

/** Mobile has the header language button; desktop has the rail segmented control (ES / EN radios). */
export async function switchLanguage(page: import('@playwright/test').Page, to: 'es' | 'en'): Promise<void> {
  const button = page.getByRole('button', { name: to === 'en' ? /Cambiar a inglés/ : 'Switch to Spanish' });
  if (await button.isVisible()) {
    await button.click();
    return;
  }
  await page.getByRole('radio', { name: to === 'en' ? 'EN' : 'ES', exact: true }).click();
}
