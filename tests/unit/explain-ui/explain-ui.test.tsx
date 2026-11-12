import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { I18nProvider } from '@/core/i18n/I18nProvider';
import { copyRegistry } from '@/core/i18n/registry';
import type { InferenceResult, PhotometryResult, SegmentationResult, ToneSimulation } from '@/core/inference/types';
import { ContourOverlay } from '@/features/inspect/explain/ContourOverlay';
import { ContourSwitch } from '@/features/inspect/explain/ContourSwitch';
import { PhotometryCard } from '@/features/inspect/explain/PhotometryCard';
import { ToneAudit } from '@/features/inspect/explain/ToneAudit';
import { useContourLayer } from '@/features/inspect/explain/contourLayer';

const simulateTone = vi.fn(async (request: { deltaL: number }): Promise<ToneSimulation> => ({
  source: 'live',
  deltaL: request.deltaL,
  imageWebpBase64: 'UklGRg==',
  width: 768,
  height: 576,
  clippedFraction: 0,
  photometry: OK_PHOTOMETRY,
}));

vi.mock('@/core/inference', () => ({
  getInferenceClient: () => ({ simulateTone }),
}));

const CONTOUR: [number, number][] = [
  [100, 80],
  [300, 80],
  [300, 260],
  [100, 260],
];

const OK_SEGMENTATION: SegmentationResult = {
  status: 'ok',
  source: 'model',
  imageWidth: 1024,
  imageHeight: 768,
  maskWidth: 512,
  maskHeight: 384,
  maskPngBase64: 'iVBORw0KGgo=',
  contour: CONTOUR,
  areaFraction: 0.183,
  threshold: 0.5,
  identity: { modelId: 'm', run: 'r', release: 'v', modelSha256: 'b'.repeat(64), inputSize: 224 },
};

const OK_PHOTOMETRY: PhotometryResult = {
  status: 'ok',
  region: 'perilesional_ring',
  medianL: 63.2,
  medianB: 14.1,
  itaDeg: 42.5,
  itaCategory: 'light',
  nPx: 5321,
  validFraction: 0.81,
};

function resultWith(overrides: Partial<InferenceResult> = {}): InferenceResult {
  return {
    source: 'live',
    model: 'MOCO_HAM7',
    mode: 'base',
    identity: { modelId: 'dermssl-v10-moco', sha256: null, sha256Verified: null, recipe: null, release: 'v10.0.0' },
    scores: { akiec: 0, bcc: 0, bkl: 0, df: 0, mel: 0, nv: 1, vasc: 0 },
    latencyMs: 1,
    warnings: [],
    segmentation: OK_SEGMENTATION,
    photometry: OK_PHOTOMETRY,
    ...overrides,
  };
}

const storage = { getItem: () => null, setItem: () => undefined, removeItem: () => undefined } as unknown as Storage;

function withI18n(node: ReactNode) {
  return (
    <I18nProvider dictionary={copyRegistry} storage={storage} navigatorLanguage="es-CO">
      {node}
    </I18nProvider>
  );
}

beforeEach(() => {
  useContourLayer.setState({ enabled: false });
  simulateTone.mockClear();
});

describe('ContourOverlay', () => {
  it('uses the natural image size as viewBox and meet letterboxing, with a double stroke', () => {
    const { container } = render(<ContourOverlay contour={CONTOUR} imageWidth={1024} imageHeight={768} />);
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe('0 0 1024 768');
    expect(svg?.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    const polygons = container.querySelectorAll('polygon');
    expect(polygons).toHaveLength(2);
    expect(polygons[0]?.getAttribute('points')).toBe('100,80 300,80 300,260 100,260');
    expect(polygons[1]?.getAttribute('vector-effect')).toBe('non-scaling-stroke');
  });
});

describe('ContourSwitch', () => {
  it('is off by default and toggles on click', async () => {
    render(withI18n(<ContourSwitch result={resultWith()} />));
    const sw = screen.getByRole('switch', { name: 'Contorno de la lesión según el modelo' });
    expect(sw.getAttribute('aria-checked')).toBe('false');
    await userEvent.click(sw);
    expect(sw.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('Contorno estimado por el modelo, con fines de investigación.')).toBeTruthy();
  });

  it('is disabled with a reason when the segmentation is unavailable', () => {
    const result = resultWith({ segmentation: { status: 'unavailable', source: 'model', reason: 'empty_mask' } });
    render(withI18n(<ContourSwitch result={result} />));
    const sw = screen.getByRole('switch');
    expect(sw.hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('No disponible. El análisis no generó un contorno válido.')).toBeTruthy();
  });

  it('explains the endpoint_missing case separately', () => {
    const result = resultWith({ segmentation: { status: 'unavailable', source: 'model', reason: 'endpoint_missing' } });
    render(withI18n(<ContourSwitch result={result} />));
    expect(screen.getByText('Esta versión del servidor no incluye el contorno.')).toBeTruthy();
  });
});

describe('PhotometryCard', () => {
  it('shows ITA with a Spanish decimal comma and its category, plus the verbatim note', () => {
    render(withI18n(<PhotometryCard photometry={OK_PHOTOMETRY} locale="es" />));
    expect(screen.getByText('ITA 42,5° · Clara')).toBeTruthy();
    expect(screen.getByText('Luminosidad mediana (L*) 63,2 · Eje amarillo-azul mediano (b*) 14,1')).toBeTruthy();
    expect(
      screen.getByText('Es una estimación de color de apoyo. No reemplaza la clasificación clínica del fototipo.'),
    ).toBeTruthy();
  });

  it('keeps L* and b* visible when ITA is indeterminate', () => {
    const indeterminate: PhotometryResult = {
      ...OK_PHOTOMETRY,
      status: 'indeterminate',
      itaDeg: null,
      itaCategory: null,
      medianB: 3.2,
    };
    render(withI18n(<PhotometryCard photometry={indeterminate} locale="es" />));
    expect(screen.getByText('No se puede determinar el ITA (b* demasiado bajo)')).toBeTruthy();
    expect(screen.getByText(/Eje amarillo-azul mediano \(b\*\) 3,2/)).toBeTruthy();
  });

  it('shows a reason text when photometry is unavailable', () => {
    render(withI18n(<PhotometryCard photometry={{ status: 'unavailable', reason: 'no_mask' }} locale="es" />));
    expect(screen.getByText('No hay medición de color disponible para esta imagen.')).toBeTruthy();
  });
});

describe('ToneAudit', () => {
  const renderAudit = (result: InferenceResult) =>
    render(withI18n(<ToneAudit result={result} file={new Blob(['img'])} src="blob:original" />));
  // Slider index 0..4 maps to ΔL* −9.73, −4.86, 0, +4.86, +9.73 (one DDI band = 4.86).
  const STEP_DARKER_1 = '1';
  const STEP_LIGHTER_2 = '4';

  it('does not call the service when the slider moves; only Simular does', async () => {
    renderAudit(resultWith());
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: STEP_DARKER_1 } });
    expect(simulateTone).not.toHaveBeenCalled();
    expect(slider.getAttribute('aria-valuetext')).toBe('Más oscura (1 paso)');
    await userEvent.click(screen.getByRole('button', { name: 'Simular' }));
    expect(simulateTone).toHaveBeenCalledTimes(1);
    expect(simulateTone.mock.calls[0]?.[0]).toMatchObject({ deltaL: -4.86, maskPngBase64: 'iVBORw0KGgo=' });
  });

  it('reuses the in-memory result for a step already simulated', async () => {
    renderAudit(resultWith());
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: STEP_LIGHTER_2 } });
    await userEvent.click(screen.getByRole('button', { name: 'Simular' }));
    fireEvent.change(slider, { target: { value: STEP_DARKER_1 } });
    await userEvent.click(screen.getByRole('button', { name: 'Simular' }));
    fireEvent.change(slider, { target: { value: STEP_LIGHTER_2 } });
    await userEvent.click(screen.getByRole('button', { name: 'Simular' }));
    expect(simulateTone).toHaveBeenCalledTimes(2);
  });

  it('never calls the service for the original step', async () => {
    renderAudit(resultWith());
    await userEvent.click(screen.getByRole('button', { name: 'Simular' }));
    expect(simulateTone).not.toHaveBeenCalled();
    expect(screen.getByText('Original: se muestra la imagen sin cambios. No se consulta el servicio.')).toBeTruthy();
  });

  it('badges the simulated image as a luminance simulation', async () => {
    renderAudit(resultWith());
    fireEvent.change(screen.getByRole('slider'), { target: { value: STEP_DARKER_1 } });
    await userEvent.click(screen.getByRole('button', { name: 'Simular' }));
    expect(await screen.findByText('Simulación de luminosidad')).toBeTruthy();
  });

  it('disables simulation with a reason when the mask is not restored after reload', () => {
    renderAudit(resultWith({ segmentation: { ...OK_SEGMENTATION, maskPngBase64: undefined } }));
    expect(screen.getByRole('button', { name: 'Simular' }).hasAttribute('disabled')).toBe(true);
    expect(
      screen.getByText('No tenemos guardada la zona de la lesión de esta imagen. Vuelva a analizar la imagen para poder simular.'),
    ).toBeTruthy();
  });
});

describe('PhotometryCard on a real indeterminate capture', () => {
  it('shows the indeterminate state and keeps L* and b* from the capture', async () => {
    const { analyzeResponseSchema, toAnalysisResult } = await import('@/core/inference/analyzeContract');
    const { parseOrInvalid } = await import('@/core/inference/contract');
    const raw = (await import('../../../fixtures/api/analyze-MOCO_HAM7-sample_02_ISIC_0014609_image.json?raw')).default;
    const result = toAnalysisResult(parseOrInvalid(analyzeResponseSchema, JSON.parse(raw), 'analyze'), 0);
    render(withI18n(<PhotometryCard photometry={result.photometry} locale="es" />));
    expect(screen.getByText('No se puede determinar el ITA (b* demasiado bajo)')).toBeTruthy();
    expect(screen.getByText(/Eje amarillo-azul mediano \(b\*\) 4,5/)).toBeTruthy();
  });
});
