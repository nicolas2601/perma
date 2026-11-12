import { expect, test, type Page } from '@playwright/test';
import { readFileSync, statSync } from 'node:fs';
import {
  COPY,
  NOTICE_TEXT,
  chooseSample,
  dismissOfflineBanner,
  openHome,
  previewImage,
  switchLanguage,
  toCapture,
  toConsentChecked,
} from './support';

const ABCDE_CRITERIA = ['A', 'B', 'C', 'D', 'E'] as const;
const ABCDE_OPTION_COUNT = 17;
const RAW_SCORE_COUNT = 7;
const NOTE_TEXT = 'Nota de prueba e2e';
const ES_UNANSWERED = 'Sin evaluar';
const EN_UNANSWERED = 'Not assessed';
const UNANSWERED_COUNT = 5;

/** Header button of one ABCDE criterion (the accordion trigger). */
/** Accessible name of each criterion's radiogroup (one group per criterion). */
const CRITERION_GROUP_NAME: Record<(typeof ABCDE_CRITERIA)[number], string> = {
  A: 'Asimetría',
  B: 'Borde',
  C: 'Color',
  D: 'Diámetro',
  E: 'Evolución',
};

const CRITERION_NAME: Record<(typeof ABCDE_CRITERIA)[number], RegExp> = {
  A: /^Asimetría/,
  B: /^Borde/,
  C: /^Color/,
  D: /^Diámetro/,
  E: /^Evolución/,
};

/** Accordion trigger of one ABCDE criterion (its accessible name starts with the criterion title). */
function criterionHeader(page: Page, criterion: (typeof ABCDE_CRITERIA)[number]) {
  return page.getByRole('button', { name: CRITERION_NAME[criterion] }).first();
}

async function openAbcde(page: Page): Promise<void> {
  await page.getByRole('button', { name: COPY.inspectImage }).click();
  await expect(page).toHaveURL(/\/inspeccion/);
  await dismissOfflineBanner(page);
  await page.getByRole('button', { name: COPY.registerAbcde }).click();
  await expect(page).toHaveURL(/\/examen\/abcde$/);
}

test.describe('9-step journey (mock build, success scenario)', () => {
  test('Home to CSV export, with the ack only after a real download', async ({ page }) => {
    await test.step('1 Home renders the entry sequence and the reference card', async () => {
      await openHome(page);
      await expect(page.getByRole('button', { name: COPY.newExam })).toBeVisible();
      await expect(page.getByText('Imagen de referencia', { exact: true })).toBeVisible();
    });

    await test.step('2 Context step, then continue to capture', async () => {
      await toCapture(page);
      await expect(page).toHaveURL(/\/imagen$/);
    });

    await test.step('3 Sample image reaches quality with the image preserved', async () => {
      await chooseSample(page);
      await expect(previewImage(page)).toBeVisible();
    });

    await test.step('4 Quality hands off to consent', async () => {
      await page.getByRole('button', { name: COPY.reviewSend }).click();
      await expect(page).toHaveURL(/\/envio$/);
    });

    await test.step('5 Consent: send is disabled until the required checkbox is ticked', async () => {
      const send = page.getByRole('button', { name: COPY.sendCta });
      await expect(send).toBeDisabled();
      await page.getByRole('checkbox', { name: COPY.consentLabel }).check();
      await expect(send).toBeEnabled();
    });

    await test.step('6 Processing completes and lands on the result', async () => {
      await page.getByRole('button', { name: COPY.sendCta }).click();
      await expect(page.getByRole('heading', { name: /Salida del modelo|Salida experimental/ }).first()).toBeVisible({ timeout: 30_000 });
      await expect(page).toHaveURL(/\/resultado$/);
    });

    await test.step('7 Result: simulated badge, notice, seven raw scores, no percentages', async () => {
      await expect(page.getByText(COPY.simulatedBadge).first()).toBeVisible();
      await expect(page.getByText(NOTICE_TEXT)).toBeVisible();
      await page.getByText(COPY.seeScores).click();
      await expect(page).toHaveURL(/\/resultado\/clases$/);
      await expect(page.locator('main a').filter({ hasText: /\d,\d{2}/ })).toHaveCount(RAW_SCORE_COUNT);
      await expect(page.locator('main')).not.toContainText('%');
      await page.goBack();
      await expect(page).toHaveURL(/\/resultado$/);
    });

    await test.step('8 Viewer exposes the three tabs', async () => {
      await page.getByRole('button', { name: COPY.inspectImage }).click();
      await expect(page).toHaveURL(/\/inspeccion/);
      await dismissOfflineBanner(page);
      await expect(page.getByRole('tab', { name: COPY.tabImage })).toBeVisible();
      await expect(page.getByRole('tab', { name: COPY.tabOutput })).toBeVisible();
      await expect(page.getByRole('tab', { name: COPY.tabObservations })).toBeVisible();
    });

    await test.step('9a ABCDE: five criteria, seventeen options, unanswered values visible', async () => {
      await page.getByRole('button', { name: COPY.registerAbcde }).click();
      await expect(page).toHaveURL(/\/examen\/abcde$/);
      for (const criterion of ABCDE_CRITERIA) {
        await expect(criterionHeader(page, criterion)).toBeVisible();
      }
      await expect(page.getByText(ES_UNANSWERED, { exact: true }).filter({ visible: true })).toHaveCount(UNANSWERED_COUNT);
      await criterionHeader(page, 'A').click();
      await expect(page.getByRole('radiogroup', { name: 'Asimetría' }).getByRole('radio')).toHaveCount(4);
      await page.getByRole('radio', { name: 'Simétrica', exact: true }).click();
      await criterionHeader(page, 'A').click();
      await expect(criterionHeader(page, 'A')).toContainText('Simétrica');
      await criterionHeader(page, 'A').click();
      await expect(criterionHeader(page, 'A')).toContainText('Simétrica');
    });

    await test.step('9b ABCDE: language ES to EN to ES keeps the record', async () => {
      await switchLanguage(page, 'en');
      await expect(page.getByText(EN_UNANSWERED, { exact: true }).filter({ visible: true })).toHaveCount(UNANSWERED_COUNT - 1);
      await switchLanguage(page, 'es');
      await expect(page.getByText(ES_UNANSWERED, { exact: true }).filter({ visible: true })).toHaveCount(UNANSWERED_COUNT - 1);
    });

    await test.step('9c Note, compare and review', async () => {
      await page.getByRole('button', { name: COPY.abcdeSummary }).click();
      await expect(page).toHaveURL(/\/examen\/comparar$/);
      await page.getByRole('button', { name: COPY.compareNote }).click();
      await page.getByRole('textbox', { name: 'Nota profesional' }).fill(NOTE_TEXT);
      await page.getByRole('button', { name: 'Guardar nota' }).click();
      await expect(page.getByText('Nota guardada.')).toBeVisible();
      await page.getByRole('button', { name: 'Cerrar' }).first().click();
      await page.getByRole('button', { name: COPY.reviewSession }).click();
      await expect(page).toHaveURL(/\/revision$/);
    });

    await test.step('10 Export CSV: ack required, real download event, then acknowledgement', async () => {
      await page.getByRole('button', { name: COPY.exportPreview }).click();
      await expect(page).toHaveURL(/\/revision\/exportar$/);
      const download = page.getByRole('button', { name: COPY.exportJson });
      await expect(download).toBeDisabled();
      await page.getByRole('checkbox', { name: COPY.exportAck }).check();
      await expect(download).toBeEnabled();
      await expect(page).toHaveURL(/\/revision\/exportar$/);
      await expect(page.getByText('Se inició la descarga.')).toHaveCount(0);
      const [file] = await Promise.all([page.waitForEvent('download'), download.click()]);
      expect(file.suggestedFilename()).toMatch(/\.csv$/);
      const path = await file.path();
      expect(path).toBeTruthy();
      expect(statSync(path as string).size).toBeGreaterThan(0);
      const csv = readFileSync(path as string, 'utf8');
      expect(csv.startsWith('\uFEFFSección;Campo;Valor;Nota')).toBe(true);
      expect(csv.split('\r\n').filter((line) => /^Puntajes crudos;/.test(line))).toHaveLength(7);
      await expect(page).toHaveURL(/\/revision\/exportada$/);
      await expect(page.getByText('Se inició la descarga.')).toBeVisible();
    });
  });
});

test.describe('ABCDE is a single accordion for the whole record', () => {
  test('all five criteria expose exactly the seventeen contract options', async ({ page }) => {
    await openHome(page);
    await toCapture(page);
    await chooseSample(page);
    await toConsentChecked(page);
    await page.getByRole('button', { name: COPY.sendCta }).click();
    await expect(page).toHaveURL(/\/resultado$/, { timeout: 30_000 });
    await openAbcde(page);
    for (const criterion of ABCDE_CRITERIA) {
      await criterionHeader(page, criterion).click();
    }
    let total = 0;
    for (const criterion of ABCDE_CRITERIA) {
      total += await page.getByRole('radiogroup', { name: CRITERION_GROUP_NAME[criterion] }).getByRole('radio').count();
    }
    expect(total).toBe(ABCDE_OPTION_COUNT);
  });
});
