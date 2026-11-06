import type { AbcdeCriterion } from '@/core/storage/types';

/** ABCDE copy. Option keys mirror `ABCDE_OPTIONS` in logic.ts (17 entries across the five criteria). */
export const copy = {
  es: {
    pageTitle: 'Mis observaciones',
    intro: 'Abra un criterio para registrar o editar su observación.',
    unanswered: 'Sin evaluar',
    back: 'Volver a la imagen',
    next: 'Ver resumen',
    navLabel: 'Criterios ABCDE',
    listLabel: 'Observaciones ABCDE',
    chosen: 'Selección',
    optionsLabel: 'Opciones del criterio',
    criterionA: 'Asimetría',
    criterionB: 'Borde',
    criterionC: 'Color',
    criterionD: 'Diámetro',
    criterionE: 'Evolución',
    descA: 'Compare ambos ejes. Registre solo lo visible.',
    descB: 'Revise el borde. Registre solo lo visible.',
    descC: 'Registre la variación de color visible sin filtros.',
    descD: 'Use una medición manual verificada o déjela sin medir.',
    descE: 'Registre el cambio reportado; no se suministra una imagen anterior.',
    'A.symmetric': 'Simétrica',
    'A.asymmetric-one-axis': 'Asimétrica en un eje',
    'A.asymmetric-two-axes': 'Asimétrica en dos ejes',
    'A.not-evaluable': 'No evaluable',
    'B.regular': 'Borde regular',
    'B.irregular': 'Borde irregular',
    'B.not-evaluable': 'No evaluable',
    'C.one-color': 'Un color',
    'C.two-colors': 'Dos colores',
    'C.three-or-more-colors': 'Tres colores o más',
    'C.not-evaluable': 'No evaluable',
    'D.over-6mm-manual': 'Más de 6 mm — manual',
    'D.up-to-6mm-manual': '6 mm o menos — manual',
    'D.no-physical-measure': 'Sin medición física',
    'E.change-reported': 'Cambio reportado',
    'E.no-change-reported': 'No se reportan cambios',
    'E.not-evaluable': 'No evaluable',
  },
  en: {
    pageTitle: 'My observations',
    intro: 'Open a criterion to record or edit your observation.',
    unanswered: 'Not assessed',
    back: 'Back to image',
    next: 'View summary',
    navLabel: 'ABCDE criteria',
    listLabel: 'ABCDE observations',
    chosen: 'Selection',
    optionsLabel: 'Criterion options',
    criterionA: 'Asymmetry',
    criterionB: 'Border',
    criterionC: 'Colour',
    criterionD: 'Diameter',
    criterionE: 'Evolution',
    descA: 'Compare both axes. Record only what is visible.',
    descB: 'Review the border. Record only what is visible.',
    descC: 'Record the visible colour variation without filters.',
    descD: 'Use a verified manual measurement or leave it unmeasured.',
    descE: 'Record the reported change; no earlier image is supplied.',
    'A.symmetric': 'Symmetric',
    'A.asymmetric-one-axis': 'Asymmetric in one axis',
    'A.asymmetric-two-axes': 'Asymmetric in two axes',
    'A.not-evaluable': 'Not evaluable',
    'B.regular': 'Regular border',
    'B.irregular': 'Irregular border',
    'B.not-evaluable': 'Not evaluable',
    'C.one-color': 'One colour',
    'C.two-colors': 'Two colours',
    'C.three-or-more-colors': 'Three or more colours',
    'C.not-evaluable': 'Not evaluable',
    'D.over-6mm-manual': 'Over 6 mm — manual',
    'D.up-to-6mm-manual': '6 mm or less — manual',
    'D.no-physical-measure': 'No physical measurement',
    'E.change-reported': 'Change reported',
    'E.no-change-reported': 'No change reported',
    'E.not-evaluable': 'Not evaluable',
  },
} as const;

export type AbcdeCopyKey = keyof typeof copy.es;

export const CRITERION_TITLE_KEY: Record<AbcdeCriterion, AbcdeCopyKey> = {
  A: 'criterionA',
  B: 'criterionB',
  C: 'criterionC',
  D: 'criterionD',
  E: 'criterionE',
};

export const CRITERION_DESC_KEY: Record<AbcdeCriterion, AbcdeCopyKey> = {
  A: 'descA',
  B: 'descB',
  C: 'descC',
  D: 'descD',
  E: 'descE',
};

/** Copy key of an option value, e.g. ("B", "regular") -> "B.regular". */
export function optionKey(criterion: AbcdeCriterion, value: string): AbcdeCopyKey {
  return `${criterion}.${value}` as AbcdeCopyKey;
}
