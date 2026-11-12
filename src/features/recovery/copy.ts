/**
 * Recovery copy (namespace `recovery`). Keys are `<scenario>.<part>`; ES and EN carry identical keys.
 * Parts: shell, title, body, primary, secondary (only where the Figma frame shows one),
 * heading1/text1 and heading2/text2 (only where the frame has sections; see RecoveryPage).
 * Source of truth: Figma frames 141:2685 to 141:2828 and 141:2705. EN is the translation of the ES.
 */
export const copy = {
  es: {
    'file-unavailable.shell': 'Imagen no disponible',
    'file-unavailable.title': 'No se pudo abrir esta imagen.',
    'file-unavailable.body':
      'Pruebe con una imagen JPEG, PNG o WebP de hasta 10 MiB y 20 megapíxeles. No se admiten fotos en formato HEIC. Su contexto registrado se conserva.',
    'file-unavailable.primary': 'Elegir otra imagen',
    'file-unavailable.heading1': 'Probar con otro archivo',
    'file-unavailable.text1': 'Elija otra imagen original y revísela antes de enviarla.',

    'permission.shell': 'Permiso de cámara denegado',
    'permission.title': 'El acceso a la cámara no está disponible.',
    'permission.body': 'Puede continuar sin usar la cámara: elija un archivo de imagen. El contexto que ya registró sigue disponible.',
    'permission.heading1': 'Usar un archivo',
    'permission.text1': 'Elija una imagen adecuada sin conceder acceso a la cámara.',
    'permission.heading2': 'Probar la cámara más tarde',
    'permission.text2': 'Si quiere usar la cámara más tarde, revise los permisos de este sitio en la configuración de su navegador y vuelva a la captura.',
    'permission.primary': 'Elegir un archivo de imagen',

    'offline.shell': 'Conexión no disponible',
    'offline.title': 'No hay conexión para el análisis.',
    'offline.body':
      'El análisis necesita conexión con el servidor. Mientras tanto, puede revisar su registro y volver a intentar el envío cuando tenga conexión.',
    'offline.heading1': 'Conservar el trabajo actual',
    'offline.text1': 'Su imagen y sus datos se mantienen durante esta sesión. No hemos verificado que se guarden sin conexión de forma permanente.',
    'offline.heading2': 'Al conectarse',
    'offline.text2': 'Cuando tenga conexión, vuelva al envío y confirme un nuevo intento. La imagen no se reenvía sola.',
    'offline.primary': 'Volver al envío',

    'server-error.shell': 'Análisis no disponible',
    'server-error.title': 'No se recibió ningún resultado del análisis.',
    'server-error.body':
      'No pudimos obtener una respuesta del servidor. No hay un resultado nuevo para este intento. Revise la imagen y el contexto antes de decidir si desea enviarla otra vez.',
    'server-error.primary': 'Revisar antes de volver a intentar',
    'server-error.detailTitle': 'Revisar la imagen',
    'server-error.detailHint': 'Abrir detalles',
    'server-error.detailFile': 'Archivo',

    'timeout.shell': 'Finalización no confirmada',
    'timeout.title': 'No pudimos confirmar que el análisis terminara.',
    'timeout.body':
      'La respuesta tardó más de lo esperado y dejamos de esperar. Esto no quiere decir que el servidor haya detenido el análisis. Puede volver a su registro. No enviaremos otra solicitud sin que usted lo decida.',
    'timeout.primary': 'Volver sin reenviar',

    'invalid-response.shell': 'Respuesta del análisis no compatible',
    'invalid-response.title': 'La respuesta no se puede usar.',
    'invalid-response.body':
      'El servidor respondió con un modelo o un formato distinto del que PERMA espera, así que no mostramos los resultados. Su registro se conserva. Puede revisar los detalles técnicos antes de volver a intentarlo.',
    'invalid-response.heading1': 'Modelo esperado',
    'invalid-response.text1':
      'MOCO_HAM7, versión base, sin TTA (aumento de imágenes al predecir), 1 vista, 3072 dimensiones, siete clases compatibles distintas entre sí y valores coherentes entre sí.',
    'invalid-response.heading2': 'Cómo seguir',
    'invalid-response.text2': 'Conserve la imagen y el registro. Verifique que el servicio sea compatible antes de hacer una nueva solicitud.',
    'invalid-response.primary': 'Volver a revisar la imagen',

    'rate-limit.shell': 'Límite de solicitudes alcanzado',
    'rate-limit.title': 'El servicio está limitando las solicitudes.',
    'rate-limit.body':
      'Espere un momento antes de volver a intentarlo. Su imagen y sus observaciones se conservan. No se reenviarán automáticamente.',
    'rate-limit.primary': 'Conservar la imagen y volver',

    'export-unavailable.shell': 'Exportación no disponible',
    'export-unavailable.title': 'No se creó la exportación.',
    'export-unavailable.body':
      'No pudimos preparar el archivo para descargarlo. Vuelva a la vista previa, revise su contenido y vuelva a intentarlo.',
    'export-unavailable.primary': 'Volver a la vista previa de exportación',
  },
  en: {
    'file-unavailable.shell': 'Image unavailable',
    'file-unavailable.title': 'This image could not be opened.',
    'file-unavailable.body':
      'Use a valid JPEG, PNG or WebP image up to 10 MiB and 20 megapixels. HEIC photos are not supported. Your recorded context is kept.',
    'file-unavailable.primary': 'Choose another image',
    'file-unavailable.heading1': 'Try another file',
    'file-unavailable.text1': 'Choose another original image and review it before sending.',

    'permission.shell': 'Camera permission denied',
    'permission.title': 'Camera access is not available.',
    'permission.body': 'You can continue without the camera: choose an image file. The context you already recorded remains available.',
    'permission.heading1': 'Use a file',
    'permission.text1': 'Choose a suitable image without granting camera access.',
    'permission.heading2': 'Try the camera later',
    'permission.text2': 'If you want to use the camera later, check this site’s permissions in your browser settings and return to capture.',
    'permission.primary': 'Choose an image file',

    'offline.shell': 'Connection unavailable',
    'offline.title': 'There is no connection for the analysis.',
    'offline.body': 'Analysis needs a connection to the server. Meanwhile, you can review your record and try sending again once you are connected.',
    'offline.heading1': 'Keep the current work',
    'offline.text1': 'Your image and data are kept during this session. We have not verified that they persist offline.',
    'offline.heading2': 'When connected',
    'offline.text2': 'Once you are connected, return to submission and confirm a new attempt. The image is not resent on its own.',
    'offline.primary': 'Back to submission',

    'server-error.shell': 'Analysis unavailable',
    'server-error.title': 'No analysis result was received.',
    'server-error.body':
      'We could not get a response from the server. There is no new result for this attempt. Review the image and context before deciding whether to send it again.',
    'server-error.primary': 'Review before trying again',
    'server-error.detailTitle': 'Review the image',
    'server-error.detailHint': 'Open details',
    'server-error.detailFile': 'File',

    'timeout.shell': 'Completion not confirmed',
    'timeout.title': 'We could not confirm that the analysis finished.',
    'timeout.body':
      'The response took longer than expected, so we stopped waiting. This does not mean the server stopped the analysis. You can return to your record. We will not send another request unless you decide to.',
    'timeout.primary': 'Go back without resending',

    'invalid-response.shell': 'Incompatible analysis response',
    'invalid-response.title': 'The response cannot be used.',
    'invalid-response.body':
      'The server answered with a model or format other than the one PERMA expects, so we are not showing the results. Your record is kept. You can review the technical details before trying again.',
    'invalid-response.heading1': 'Expected model',
    'invalid-response.text1':
      'MOCO_HAM7, base version, no TTA (image augmentation at prediction time), 1 view, 3072 dimensions, seven distinct compatible classes and values that agree with each other.',
    'invalid-response.heading2': 'What to do next',
    'invalid-response.text2': 'Keep the image and record. Check that the service is compatible before making a new request.',
    'invalid-response.primary': 'Review the image again',

    'rate-limit.shell': 'Request limit reached',
    'rate-limit.title': 'The service is limiting requests.',
    'rate-limit.body': 'Wait a moment before trying again. Your image and observations are kept. They will not be resent automatically.',
    'rate-limit.primary': 'Keep the image and go back',

    'export-unavailable.shell': 'Export unavailable',
    'export-unavailable.title': 'The export was not created.',
    'export-unavailable.body':
      'We could not prepare the file for download. Return to the preview, check its contents and try again.',
    'export-unavailable.primary': 'Back to export preview',
  },
} as const;
