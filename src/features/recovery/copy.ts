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
      'Use una imagen JPEG, PNG o WebP válida de hasta 10 MiB y 20 MP. HEIC no es compatible. El contexto registrado se conserva.',
    'file-unavailable.primary': 'Elegir otra imagen',
    'file-unavailable.heading1': 'Probar con otro archivo',
    'file-unavailable.text1': 'Elija otra imagen original y revísela antes de enviarla. El contexto registrado se conserva.',

    'permission.shell': 'Permiso de cámara denegado',
    'permission.title': 'El acceso a la cámara no está disponible.',
    'permission.body': 'El escenario de permiso denegado no bloquea la selección de archivos. El contexto registrado sigue disponible.',
    'permission.heading1': 'Usar un archivo',
    'permission.text1': 'Elija una imagen adecuada sin conceder acceso a la cámara.',
    'permission.heading2': 'Probar la cámara más tarde',
    'permission.text2': 'Revise los permisos del sitio en la configuración de su navegador y vuelva a la captura.',
    'permission.primary': 'Elegir un archivo de imagen',

    'offline.shell': 'Conexión no disponible',
    'offline.title': 'Sin conexión para el análisis.',
    'offline.body':
      'Una solicitud real al modelo requiere el servicio de inferencia. La interfaz no debe mostrar un resultado nuevo sin conexión.',
    'offline.heading1': 'Conservar el trabajo actual',
    'offline.text1': 'Conserve la entrada durante esta sesión. No se ha verificado el almacenamiento persistente sin conexión.',
    'offline.heading2': 'Al conectarse',
    'offline.text2': 'Volver al envío y reintentar explícitamente. No cargue en segundo plano sin avisar.',
    'offline.primary': 'Volver al envío',

    'server-error.shell': 'Análisis no disponible',
    'server-error.title': 'No se recibió ningún resultado del análisis.',
    'server-error.body':
      'Escenario de error del servidor. No muestre puntajes anteriores como si fueran una respuesta nueva. Conserve la imagen y el contexto actuales para un reintento deliberado.',
    'server-error.primary': 'Revise antes de reintentar',
    'server-error.detailTitle': 'Revisar la imagen',
    'server-error.detailHint': 'Abrir detalles',
    'server-error.detailFile': 'Archivo',

    'timeout.shell': 'Finalización no confirmada',
    'timeout.title': 'No se confirmó la finalización.',
    'timeout.body':
      'Un tiempo de espera agotado no demuestra que el servidor se haya detenido. Evite el reenvío automático y explique qué puede confirmar el servicio.',
    'timeout.primary': 'Volver sin reenviar',

    'invalid-response.shell': 'Incompatibilidad del contrato del modelo',
    'invalid-response.title': 'La respuesta no se puede usar.',
    'invalid-response.body':
      'La identidad devuelta o la estructura de puntajes no coincide con el contrato validado del cliente. No se deben mostrar puntajes de clase.',
    'invalid-response.heading1': 'Identidad esperada',
    'invalid-response.text1':
      'B71 / base / D4 / 8 vistas / 3072 dimensiones, con siete clases compatibles únicas y puntajes coherentes.',
    'invalid-response.heading2': 'Recuperación',
    'invalid-response.text2': 'Conserve la entrada. Compruebe la compatibilidad del servicio antes de una nueva solicitud.',
    'invalid-response.primary': 'Revisar contrato técnico',

    'rate-limit.shell': 'Límite de solicitudes alcanzado',
    'rate-limit.title': 'El servicio está limitando las solicitudes.',
    'rate-limit.body':
      'Espere antes de volver a intentarlo. Conserve la imagen y las observaciones; no habrá reenvío automático.',
    'rate-limit.primary': 'Conservar la imagen y volver',

    'export-unavailable.shell': 'Exportación no disponible',
    'export-unavailable.title': 'No se creó la exportación.',
    'export-unavailable.body':
      'Escenario de recuperación. Mantenga disponible la sesión y permita que el profesional vuelva a intentarlo sin perder las observaciones.',
    'export-unavailable.primary': 'Volver a la vista previa de exportación',
  },
  en: {
    'file-unavailable.shell': 'Image unavailable',
    'file-unavailable.title': 'This image could not be opened.',
    'file-unavailable.body':
      'Use a valid JPEG, PNG or WebP image up to 10 MiB and 20 MP. HEIC is not supported. The recorded context is kept.',
    'file-unavailable.primary': 'Choose another image',
    'file-unavailable.heading1': 'Try another file',
    'file-unavailable.text1': 'Choose another original image and review it before sending. The recorded context is kept.',

    'permission.shell': 'Camera permission denied',
    'permission.title': 'Camera access is not available.',
    'permission.body': 'Denied camera permission does not block file selection. The recorded context remains available.',
    'permission.heading1': 'Use a file',
    'permission.text1': 'Choose a suitable image without granting camera access.',
    'permission.heading2': 'Try the camera later',
    'permission.text2': 'Check the site permissions in your browser settings and return to capture.',
    'permission.primary': 'Choose an image file',

    'offline.shell': 'Connection unavailable',
    'offline.title': 'No connection for the analysis.',
    'offline.body': 'A real model request needs the inference service. The interface must not show a new result offline.',
    'offline.heading1': 'Keep the current work',
    'offline.text1': 'Keep the input during this session. Offline persistent storage has not been verified.',
    'offline.heading2': 'When connected',
    'offline.text2': 'Return to submission and retry explicitly. Nothing is uploaded in the background without notice.',
    'offline.primary': 'Back to submission',

    'server-error.shell': 'Analysis unavailable',
    'server-error.title': 'No analysis result was received.',
    'server-error.body':
      'Server error scenario. Do not show earlier scores as if they were a new response. Keep the current image and context for a deliberate retry.',
    'server-error.primary': 'Review before retrying',
    'server-error.detailTitle': 'Review the image',
    'server-error.detailHint': 'Open details',
    'server-error.detailFile': 'File',

    'timeout.shell': 'Completion not confirmed',
    'timeout.title': 'Completion could not be confirmed.',
    'timeout.body':
      'A timeout does not prove that the server stopped. Avoid automatic resending and explain what the service can confirm.',
    'timeout.primary': 'Go back without resending',

    'invalid-response.shell': 'Model contract mismatch',
    'invalid-response.title': 'The response cannot be used.',
    'invalid-response.body':
      'The returned identity or score structure does not match the validated client contract. No class scores must be shown.',
    'invalid-response.heading1': 'Expected identity',
    'invalid-response.text1': 'B71 / base / D4 / 8 views / 3072 dimensions, with seven unique compatible classes and coherent scores.',
    'invalid-response.heading2': 'Recovery',
    'invalid-response.text2': 'Keep the input. Check the service compatibility before a new request.',
    'invalid-response.primary': 'Review technical contract',

    'rate-limit.shell': 'Request limit reached',
    'rate-limit.title': 'The service is limiting requests.',
    'rate-limit.body': 'Wait before trying again. The image and observations are kept; there will be no automatic resend.',
    'rate-limit.primary': 'Keep the image and go back',

    'export-unavailable.shell': 'Export unavailable',
    'export-unavailable.title': 'The export was not created.',
    'export-unavailable.body':
      'Recovery scenario. Keep the session available and let the professional try again without losing the observations.',
    'export-unavailable.primary': 'Back to export preview',
  },
} as const;
