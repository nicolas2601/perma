// Feature copy (ES default, EN). Keys must match across locales; no claims about image quality.
export const copy = {
  es: {
    'guide.label': 'Guía de encuadre',
    'guide.manual': 'Sin ayuda en vivo. Encuadre a mano y capture cuando la zona se vea bien.',
    'guide.disclaimer': 'Orientación de encuadre. No evalúa la calidad de la imagen.',
    'advice.closer': 'Acerque un poco',
    'advice.more-light': 'Busque más luz',
    'advice.avoid-glare': 'Evite el reflejo',
    'advice.hold-still': 'Mantenga quieto el teléfono',
    'advice.center-area': 'Centre la zona',
    'advice.check-focus': 'Revise el enfoque',
  },
  en: {
    'guide.label': 'Framing guide',
    'guide.manual': 'No live guidance. Frame by hand and capture when the area looks right.',
    'guide.disclaimer': 'Framing guidance only. It does not assess image quality.',
    'advice.closer': 'Move a little closer',
    'advice.more-light': 'Find more light',
    'advice.avoid-glare': 'Avoid the reflection',
    'advice.hold-still': 'Hold the phone still',
    'advice.center-area': 'Center the area',
    'advice.check-focus': 'Check the focus',
  },
} as const satisfies { es: Record<string, string>; en: Record<string, string> };
