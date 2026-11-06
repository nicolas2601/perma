import type { RecoveryScenario } from '@/core/inference/types';

/** Scenario -> recovery route (design/architecture.md section 2). */
export const RECOVERY_PATHS: Record<RecoveryScenario, string> = {
  'file-unavailable': '/recuperacion/archivo',
  permission: '/recuperacion/permiso',
  offline: '/recuperacion/sin-conexion',
  'server-error': '/recuperacion/servidor',
  timeout: '/recuperacion/tiempo',
  'invalid-response': '/recuperacion/respuesta',
  'rate-limit': '/recuperacion/limite',
  'export-unavailable': '/recuperacion/exportacion',
};

export const CAPTURE_PATH = '/imagen';
export const CAMERA_PATH = '/imagen/camara';
export const GALLERY_PATH = '/imagen/muestras';
export const QUALITY_PATH = '/imagen/calidad';
export const CONSENT_PATH = '/envio';
export const PROCESSING_PATH = '/envio/procesando';
export const RESULT_PATH = '/resultado';
export const CONTEXT_PATH = '/contexto';
export const DESK_PATH = '/';
