import type { Locale } from '@/core/i18n/contract';
import type { RecoveryScenario } from '@/core/inference/types';

export interface RecoveryEntry {
  shell: string;
  title: string;
  body: string;
  sections: readonly { heading: string; text: string }[];
  primary: string;
  secondary?: string;
}

/**
 * Recovery copy per scenario. Figma-verified: file-unavailable, permission, offline, server-error.
 * The other four are written from BRIEF and design/architecture.md and were not compared with Figma.
 */
export const RECOVERY_COPY: Record<Locale, Record<RecoveryScenario, RecoveryEntry>> = {
  es: {
    'file-unavailable': {
      shell: 'Imagen no disponible',
      title: 'No se pudo abrir esta imagen.',
      body: 'Use una imagen JPEG, PNG o WebP válida de hasta 10 MiB y 20 MP. HEIC no es compatible. El contexto registrado se conserva.',
      sections: [{ heading: 'Probar con otro archivo', text: 'Elija otra imagen original y revísela antes de enviarla. El contexto registrado se conserva.' }],
      primary: 'Elegir otra imagen',
    },
    permission: {
      shell: 'Permiso de cámara denegado',
      title: 'El acceso a la cámara no está disponible.',
      body: 'El escenario de permiso denegado no bloquea la selección de archivos. El contexto registrado sigue disponible.',
      sections: [
        { heading: 'Usar un archivo', text: 'Elija una imagen adecuada sin conceder acceso a la cámara.' },
        { heading: 'Probar la cámara más tarde', text: 'Revise los permisos del sitio en la configuración de su navegador y vuelva a la captura.' },
      ],
      primary: 'Elegir un archivo de imagen',
      secondary: 'Intentar la cámara de nuevo',
    },
    offline: {
      shell: 'Conexión no disponible',
      title: 'Sin conexión para el análisis.',
      body: 'Una solicitud real al modelo requiere el servicio de inferencia. La interfaz no debe mostrar un resultado nuevo sin conexión.',
      sections: [
        { heading: 'Conservar el trabajo actual', text: 'Conserve la entrada durante esta sesión. No se ha verificado el almacenamiento persistente sin conexión.' },
        { heading: 'Al conectarse', text: 'Volver al envío y reintentar explícitamente. No cargue en segundo plano sin avisar.' },
      ],
      primary: 'Volver al envío',
    },
    'server-error': {
      shell: 'Análisis no disponible',
      title: 'No se recibió ningún resultado del análisis.',
      body: 'Escenario de error del servidor. No muestre puntajes anteriores como si fueran una respuesta nueva. Conserve la imagen y el contexto actuales para un reintento deliberado.',
      sections: [],
      primary: 'Revise antes de reintentar',
      secondary: 'Volver al envío',
    },
    timeout: {
      shell: 'Tiempo de espera agotado',
      title: 'El análisis tardó demasiado.',
      body: 'Se detuvo la espera al alcanzar el límite de tiempo. No se muestra ningún resultado parcial. La imagen y el contexto se conservan.',
      sections: [{ heading: 'Reintento deliberado', text: 'Revise la imagen y vuelva a enviarla con su autorización.' }],
      primary: 'Revisar la imagen',
      secondary: 'Volver al envío',
    },
    'invalid-response': {
      shell: 'Respuesta no válida',
      title: 'La respuesta del servicio no es válida.',
      body: 'No se muestra ningún dato parcial. La respuesta no cumplió el formato esperado.',
      sections: [],
      primary: 'Revisar la imagen',
      secondary: 'Volver al envío',
    },
    'rate-limit': {
      shell: 'Límite de solicitudes',
      title: 'Se alcanzó el límite de solicitudes.',
      body: 'El servicio pide esperar antes de enviar otra solicitud. La aplicación no reintenta sola.',
      sections: [{ heading: 'Cuando decida reintentar', text: 'Revise la imagen y envíe de nuevo solo cuando usted lo indique.' }],
      primary: 'Revisar la imagen',
      secondary: 'Volver al envío',
    },
    'export-unavailable': {
      shell: 'Exportación no disponible',
      title: 'No se pudo exportar.',
      body: 'No se ha descargado ningún archivo. La pantalla no muestra una exportación completada.',
      sections: [],
      primary: 'Volver a la comparación',
    },
  },
  en: {
    'file-unavailable': {
      shell: 'Image unavailable',
      title: 'This image could not be opened.',
      body: 'Use a valid JPEG, PNG or WebP image up to 10 MiB and 20 MP. HEIC is not supported. The recorded context is kept.',
      sections: [{ heading: 'Try another file', text: 'Choose another original image and review it before sending. The recorded context is kept.' }],
      primary: 'Choose another image',
    },
    permission: {
      shell: 'Camera permission denied',
      title: 'Camera access is not available.',
      body: 'Denied camera permission does not block file selection. The recorded context remains available.',
      sections: [
        { heading: 'Use a file', text: 'Choose a suitable image without granting camera access.' },
        { heading: 'Try the camera later', text: 'Check the site permissions in your browser settings and return to capture.' },
      ],
      primary: 'Choose an image file',
      secondary: 'Try the camera again',
    },
    offline: {
      shell: 'Connection unavailable',
      title: 'No connection for the analysis.',
      body: 'A real model request needs the inference service. The interface must not show a new result offline.',
      sections: [
        { heading: 'Keep the current work', text: 'Keep the input during this session. Offline persistent storage has not been verified.' },
        { heading: 'When connected', text: 'Return to submission and retry explicitly. Nothing is uploaded in the background without notice.' },
      ],
      primary: 'Back to submission',
    },
    'server-error': {
      shell: 'Analysis unavailable',
      title: 'No analysis result was received.',
      body: 'Server error scenario. Do not show earlier scores as if they were a new response. Keep the current image and context for a deliberate retry.',
      sections: [],
      primary: 'Review before retrying',
      secondary: 'Back to submission',
    },
    timeout: {
      shell: 'Timed out',
      title: 'The analysis took too long.',
      body: 'Waiting stopped at the time limit. No partial result is shown. The image and context are kept.',
      sections: [{ heading: 'Deliberate retry', text: 'Review the image and send it again with your authorisation.' }],
      primary: 'Review the image',
      secondary: 'Back to submission',
    },
    'invalid-response': {
      shell: 'Invalid response',
      title: 'The service response is not valid.',
      body: 'No partial data is shown. The response did not match the expected format.',
      sections: [],
      primary: 'Review the image',
      secondary: 'Back to submission',
    },
    'rate-limit': {
      shell: 'Request limit',
      title: 'The request limit was reached.',
      body: 'The service asks you to wait before sending another request. The app does not retry on its own.',
      sections: [{ heading: 'When you decide to retry', text: 'Review the image and send it again only when you choose to.' }],
      primary: 'Review the image',
      secondary: 'Back to submission',
    },
    'export-unavailable': {
      shell: 'Export unavailable',
      title: 'The export could not be completed.',
      body: 'No file was downloaded. This screen does not show a completed export.',
      sections: [],
      primary: 'Back to comparison',
    },
  },
};
