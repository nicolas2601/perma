/** Calibration reference copy (Figma 141:3455). Frame 141:3480 (ready list) is not implemented yet. */
export const calibrationCopy = {
  es: {
    title: 'Mis observaciones · Escala',
    heading: 'Una referencia antes que un número.',
    body: 'En una implementación real, establezca una longitud física conocida en el mismo plano de la lesión. Este prototipo no calibra la fotografía.',
    noRulerTitle: 'No dé por sentada la regla',
    noRulerBody: 'Las marcas visibles por sí solas no verifican las unidades, la perspectiva ni la geometría de adquisición.',
    withoutTitle: 'Sin calibración',
    withoutBody: 'Registre Sin medición física. No convierta píxeles a milímetros.',
    action: 'Ir al criterio D',
  },
  en: {
    title: 'My observations · Scale',
    heading: 'A reference before a number.',
    body: 'In a real deployment, set a known physical length in the same plane as the lesion. This prototype does not calibrate the photograph.',
    noRulerTitle: 'Do not assume the ruler',
    noRulerBody: 'Visible markings alone do not verify units, perspective or acquisition geometry.',
    withoutTitle: 'Without calibration',
    withoutBody: 'Record No physical measurement. Do not convert pixels to millimetres.',
    action: 'Go to criterion D',
  },
} as const;

export type CalibrationCopyKey = keyof typeof calibrationCopy.es;
