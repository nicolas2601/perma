/** Reference pages copy: guide, privacy and the dev-only tone page. */
export const copy = {
  es: {
    guideTitle: 'Referencia · Guía',
    guideHeading: 'Cómo usar PERMA y leer sus resultados',
    guideIntro: 'Prepare una imagen, autorice el análisis si corresponde y registre sus propias observaciones. La salida de la IA y la revisión manual se mantienen separadas; ninguna sustituye la valoración clínica.',
    evidenceTitle: 'Límite de la evidencia',
    evidenceBody: 'Esta interfaz usa MoCo HAM7: siete categorías estudiadas en imágenes dermatoscópicas. No incluye SCC como categoría independiente. Aunque permita cargar una foto de celular, eso no demuestra que el modelo sea válido para analizarla. Sus puntajes no confirman ni descartan enfermedades.',
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
      'El registro ABCDE, la nota profesional, el contexto de la sesión y la imagen que usted cargó o tomó, guardados en este navegador hasta que descarte el examen. La imagen no se sube sin su acción. Los fotogramas que analiza la guía de la cámara nunca se almacenan ni se suben.',
    travelTitle: 'Viaja al servidor cuando usted pulsa Enviar',
    travelBody:
      'Una copia redimensionada de la imagen, sin ubicación EXIF, junto con el identificador del modelo y el modo de análisis. El contexto, el registro ABCDE y la nota se quedan en este dispositivo y no modifican los puntajes del modelo.',
    retentionTitle: 'Retención y acceso',
    retentionBody:
      'En una solicitud real, la política de retención, acceso y eliminación del servidor debe verificarse por separado.',
    referenceTitle: 'Imagen de referencia',
    referenceBody:
      'La imagen de ejemplo incluida es una fotografía pública de P. Tschandl con licencia CC BY-SA 4.0. Es independiente de las imágenes que usted añada a sus registros.',
    licencesTitle: 'Licencias',
    licencesBody:
      'Tipografía Geist: SIL Open Font License 1.1. Iconos: diseño propio del proyecto. MoCo V10 continúa el aprendizaje de DINOv2 con imágenes ISIC y PAD, no con datos sintéticos. Consulte las licencias y atribuciones del release antes de reutilizar el modelo; su uso está limitado a investigación no comercial.',
    noGuaranteeTitle: 'Qué debe comprobarse por separado',
    noGuaranteeBody:
      'Guardar un registro en este navegador no garantiza cifrado en el dispositivo ni borrado automático en el servidor. El análisis del modelo necesita conexión. Verifique el tratamiento de datos antes de usar imágenes sensibles.',
    privacyAction: 'Volver al envío',
    toneTitle: 'Tono solo para investigación',
    toneBody: 'Ruta exclusiva de desarrollo. No forma parte de la aplicación de producción.',
  },
  en: {
    guideTitle: 'Reference · Guide',
    guideHeading: 'How to use PERMA and read its results',
    guideIntro: 'Prepare an image, authorise analysis when appropriate and record your own observations. AI output and manual review remain separate; neither replaces clinical assessment.',
    evidenceTitle: 'Limits of the evidence',
    evidenceBody: 'This interface uses MoCo HAM7: seven categories studied on dermoscopic images. It does not include SCC as a separate category. Accepting a phone photograph does not establish that the model is valid for analysing it. Scores cannot confirm or rule out a condition.',
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
      'The ABCDE record, the professional note, the session context and the image you loaded or took, kept in this browser until you discard the exam. The image is not uploaded without your action. The frames the camera guide analyses are never stored or uploaded.',
    travelTitle: 'Travels to the server when you press Send',
    travelBody:
      'A resized copy of the image, without EXIF location, together with the model identifier and analysis mode. Context, the ABCDE record and the note stay on this device and do not change the model scores.',
    retentionTitle: 'Retention and access',
    retentionBody:
      'In a real request, the server’s retention, access and deletion policy must be verified separately.',
    referenceTitle: 'Reference image',
    referenceBody:
      'The included example is a public photograph by P. Tschandl under CC BY-SA 4.0. It is separate from the images you add to your records.',
    licencesTitle: 'Licences',
    licencesBody:
      'Geist typeface: SIL Open Font License 1.1. Icons: project-made design. MoCo V10 continues DINOv2 learning with ISIC and PAD images, not synthetic data. Check the release licences and attributions before reusing the model; use is limited to non-commercial research.',
    noGuaranteeTitle: 'What needs a separate check',
    noGuaranteeBody:
      'Saving a record in this browser does not guarantee device encryption or automatic server deletion. Model analysis needs a connection. Check data handling before using sensitive images.',
    privacyAction: 'Back to sending',
    toneTitle: 'Research-only tone',
    toneBody: 'Development-only route. It is not part of the production application.',
  },
} as const;

export type GuideCopyKey = keyof typeof copy.es;
