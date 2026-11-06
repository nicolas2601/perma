/** Reference pages copy: guide, privacy and the dev-only tone page. */
export const copy = {
  es: {
    guideTitle: 'Referencia · Guía',
    guideHeading: 'Ayuda técnica. No es un diagnóstico.',
    guideIntro: 'Use la imagen de origen, el contexto suministrado y su criterio profesional. El modelo es experimental.',
    evidenceTitle: 'Límite de la evidencia',
    evidenceBody: 'La evidencia del modelo es principalmente dermatoscópica. Aceptar una fotografía corriente no demuestra validez clínica.',
    manualTitle: 'Examen manual',
    manualBody: 'ABCDE registra las observaciones del profesional; no es un puntaje automático de riesgo.',
    modelIdentityLabel: 'Identidad del modelo y de la inferencia',
    modelIdentityHint: 'Abrir detalles',
    privacyLabel: 'Tratamiento de datos',
    privacyHint: 'Abrir detalles',
    toneLabel: 'Transformación de tono solo para investigación',
    toneHint: 'Abrir detalles',
    imageAttribution: 'Imagen: P. Tschandl · CC BY-SA 4.0',
    back: 'Volver al espacio de trabajo',
    info: 'Alcance y métodos',
    privacyTitle: 'Referencia · Tratamiento de datos',
    privacyHeading: 'Entienda el recorrido de los datos.',
    privacyIntro:
      'Esta versión es un prototipo de investigación. Describe qué queda en su dispositivo y qué viaja al servidor de inferencia cuando usted lo solicita.',
    stayTitle: 'Permanece en su dispositivo',
    stayBody:
      'El registro ABCDE, la nota profesional y el contexto de la sesión. La imagen original no se sube sin su acción. Los fotogramas de la cámara nunca se almacenan ni se suben.',
    travelTitle: 'Viaja al servidor cuando usted pulsa Enviar',
    travelBody:
      'Una copia redimensionada de la imagen, sin ubicación EXIF, junto con el modelo y el modo elegidos. No se envían el registro ABCDE ni la nota.',
    retentionTitle: 'Retención y acceso',
    retentionBody:
      'En una solicitud real, la política de retención, acceso y eliminación del servidor debe verificarse por separado.',
    referenceTitle: 'Imagen de referencia',
    referenceBody:
      'La única imagen de ejemplo es una fotografía pública de P. Tschandl con licencia CC BY-SA 4.0. No hay imágenes de pacientes en esta aplicación.',
    licencesTitle: 'Licencias',
    licencesBody:
      'Tipografía Geist: SIL Open Font License 1.1. Iconos: diseño propio del proyecto. Modelo: entrenado con datos sintéticos; su licencia de uso debe confirmarse antes de cualquier publicación.',
    noGuaranteeTitle: 'Sin garantías inventadas',
    noGuaranteeBody:
      'Esta versión no afirma cifrado en reposo, eliminación automática ni inferencia sin conexión sin evidencia de implementación.',
    privacyAction: 'Volver al envío',
    toneTitle: 'Tono solo para investigación',
    toneBody: 'Ruta exclusiva de desarrollo. No forma parte de la aplicación de producción.',
  },
  en: {
    guideTitle: 'Reference · Guide',
    guideHeading: 'Technical help. Not a diagnosis.',
    guideIntro: 'Use the source image, the context provided and your professional judgement. The model is experimental.',
    evidenceTitle: 'Limits of the evidence',
    evidenceBody: 'The model evidence is mainly dermoscopic. Accepting an ordinary photograph does not demonstrate clinical validity.',
    manualTitle: 'Manual examination',
    manualBody: 'ABCDE records the professional’s observations; it is not an automatic risk score.',
    modelIdentityLabel: 'Model and inference identity',
    modelIdentityHint: 'Open details',
    privacyLabel: 'Data handling',
    privacyHint: 'Open details',
    toneLabel: 'Tone transform for research only',
    toneHint: 'Open details',
    imageAttribution: 'Image: P. Tschandl · CC BY-SA 4.0',
    back: 'Back to workspace',
    info: 'Scope and methods',
    privacyTitle: 'Reference · Data handling',
    privacyHeading: 'Understand the path of the data.',
    privacyIntro:
      'This version is a research prototype. It describes what stays on your device and what travels to the inference server when you request it.',
    stayTitle: 'Stays on your device',
    stayBody:
      'The ABCDE record, the professional note and the session context. The original image is not uploaded without your action. Camera frames are never stored or uploaded.',
    travelTitle: 'Travels to the server when you press Send',
    travelBody:
      'A resized copy of the image, without EXIF location, together with the chosen model and mode. The ABCDE record and the note are not sent.',
    retentionTitle: 'Retention and access',
    retentionBody:
      'In a real request, the server’s retention, access and deletion policy must be verified separately.',
    referenceTitle: 'Reference image',
    referenceBody:
      'The only example image is a public photograph by P. Tschandl under CC BY-SA 4.0. There are no patient images in this application.',
    licencesTitle: 'Licences',
    licencesBody:
      'Geist typeface: SIL Open Font License 1.1. Icons: project-made design. Model: trained on synthetic data; its usage licence must be confirmed before any publication.',
    noGuaranteeTitle: 'No invented guarantees',
    noGuaranteeBody:
      'This version does not claim encryption at rest, automatic deletion or offline inference without implementation evidence.',
    privacyAction: 'Back to sending',
    toneTitle: 'Research-only tone',
    toneBody: 'Development-only route. It is not part of the production application.',
  },
} as const;

export type GuideCopyKey = keyof typeof copy.es;
