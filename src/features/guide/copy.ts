/** Reference pages copy: guide, privacy and the dev-only tone page. */
export const copy = {
  es: {
    guideTitle: 'Referencia · Guía',
    guideHeading: 'Cómo usar PERMA y leer sus resultados',
    guideIntro: 'Prepare una imagen, autorice el análisis cuando corresponda y anote sus propias observaciones. El resultado de la IA y su revisión manual se mantienen separados; ninguno de los dos reemplaza la valoración clínica.',
    evidenceTitle: 'Límite de la evidencia',
    evidenceBody: 'La aplicación usa un modelo entrenado con imágenes dermatoscópicas de siete tipos de lesión. No incluye el carcinoma escamocelular (SCC) como categoría independiente. Que la aplicación acepte una fotografía de celular no demuestra que el modelo sirva para analizarla. Sus puntajes no confirman ni descartan ninguna enfermedad.',
    manualTitle: 'Examen manual',
    manualBody: 'La regla ABCDE registra las observaciones del profesional. No es una medida automática de riesgo.',
    modelIdentityLabel: 'Datos del modelo y del análisis',
    modelIdentityHint: 'Abrir detalles',
    privacyLabel: 'Tratamiento de datos',
    privacyHint: 'Abrir detalles',
    toneLabel: 'Ajuste de tono, solo para investigación',
    toneHint: 'Abrir detalles',
    imageAttribution: 'Imagen: P. Tschandl · CC BY-SA 4.0',
    back: 'Volver al espacio de trabajo',
    info: 'Alcance y métodos',
    privacyTitle: 'Referencia · Tratamiento de datos',
    privacyHeading: 'Entienda el recorrido de los datos.',
    privacyIntro:
      'Esta versión es un prototipo de investigación. Describe qué queda en su dispositivo y qué viaja al servidor de análisis cuando usted lo solicita.',
    stayTitle: 'Permanece en su dispositivo',
    stayBody:
      'La revisión ABCDE, la nota profesional, el contexto del examen y la imagen que usted cargó o tomó se guardan en este navegador hasta que descarte el examen. La imagen no se sube sin que usted lo decida. Las imágenes que analiza la guía de la cámara no se guardan ni se suben.',
    travelTitle: 'Viaja al servidor cuando usted pulsa Enviar',
    travelBody:
      'Una copia reducida de la imagen, sin datos de ubicación (EXIF), junto con la versión del modelo y el tipo de análisis. El contexto, la revisión ABCDE y la nota se quedan en este dispositivo y no cambian los puntajes del modelo.',
    retentionTitle: 'Conservación y acceso',
    retentionBody:
      'En un envío real, la política del servidor sobre conservación, acceso y eliminación debe verificarse por separado.',
    referenceTitle: 'Imagen de referencia',
    referenceBody:
      'La imagen de ejemplo incluida es una fotografía pública de P. Tschandl con licencia CC BY-SA 4.0. Es independiente de las imágenes que usted añada a sus registros.',
    licencesTitle: 'Licencias',
    licencesBody:
      'Tipografía Geist: SIL Open Font License 1.1. Iconos: diseño propio del proyecto. El modelo MoCo V10 continúa el aprendizaje de DINOv2 con imágenes de ISIC y PAD, no con datos sintéticos. Revise las licencias y atribuciones de la versión publicada antes de reutilizar el modelo. Su uso está limitado a investigación no comercial.',
    noGuaranteeTitle: 'Qué debe comprobarse por separado',
    noGuaranteeBody:
      'Guardar un registro en este navegador no implica cifrado en el dispositivo ni borrado automático en el servidor. El análisis del modelo necesita conexión. Revise el tratamiento de datos antes de usar imágenes sensibles.',
    privacyAction: 'Volver al envío',
    toneTitle: 'Tono solo para investigación',
    toneBody: 'Ruta exclusiva de desarrollo. No forma parte de la aplicación de producción.',
  },
  en: {
    guideTitle: 'Reference · Guide',
    guideHeading: 'How to use PERMA and read its results',
    guideIntro: 'Prepare an image, authorise analysis when appropriate and note your own observations. The AI result and your manual review are kept separate; neither one replaces clinical assessment.',
    evidenceTitle: 'Limits of the evidence',
    evidenceBody: 'The app uses a model trained on dermoscopic images of seven lesion types. It does not include squamous cell carcinoma (SCC) as a separate category. The app accepting a phone photograph does not show that the model is suitable for analysing it. Its scores neither confirm nor rule out any condition.',
    manualTitle: 'Manual examination',
    manualBody: 'The ABCDE rule records the professional’s observations. It is not an automatic risk measure.',
    modelIdentityLabel: 'Model and analysis details',
    modelIdentityHint: 'Open details',
    privacyLabel: 'Data handling',
    privacyHint: 'Open details',
    toneLabel: 'Tone adjustment, research only',
    toneHint: 'Open details',
    imageAttribution: 'Image: P. Tschandl · CC BY-SA 4.0',
    back: 'Back to workspace',
    info: 'Scope and methods',
    privacyTitle: 'Reference · Data handling',
    privacyHeading: 'Understand the path of the data.',
    privacyIntro:
      'This version is a research prototype. It describes what stays on your device and what is sent to the analysis server when you request it.',
    stayTitle: 'Stays on your device',
    stayBody:
      'The ABCDE review, the professional note, the exam context and the image you uploaded or took are kept in this browser until you discard the exam. The image is not uploaded unless you decide to. The frames the camera guide analyses are never stored or uploaded.',
    travelTitle: 'Sent to the server when you press Send',
    travelBody:
      'A reduced copy of the image, without location data (EXIF), together with the model version and the type of analysis. The context, the ABCDE review and the note stay on this device and do not change the model scores.',
    retentionTitle: 'Retention and access',
    retentionBody:
      'For a real submission, the server’s policy on retention, access and deletion must be checked separately.',
    referenceTitle: 'Reference image',
    referenceBody:
      'The included example is a public photograph by P. Tschandl under CC BY-SA 4.0. It is separate from the images you add to your records.',
    licencesTitle: 'Licences',
    licencesBody:
      'Geist typeface: SIL Open Font License 1.1. Icons: project-made design. The MoCo V10 model continues DINOv2 learning with ISIC and PAD images, not synthetic data. Check the licences and attributions of the published version before reusing the model. Use is limited to non-commercial research.',
    noGuaranteeTitle: 'What needs a separate check',
    noGuaranteeBody:
      'Saving a record in this browser does not imply device encryption or automatic deletion on the server. Model analysis needs a connection. Check data handling before using sensitive images.',
    privacyAction: 'Back to sending',
    toneTitle: 'Research-only tone',
    toneBody: 'Development-only route. It is not part of the production application.',
  },
} as const;

export type GuideCopyKey = keyof typeof copy.es;
