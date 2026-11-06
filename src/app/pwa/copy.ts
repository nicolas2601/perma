import type { FeatureCopy } from '@/core/i18n/contract';

export const copy = {
  es: {
    regionLabel: 'Estado de la aplicación',
    updateReady: 'Hay una versión nueva de PERMA.',
    updateBlocked:
      'Hay una versión nueva. Podrá actualizar cuando termine o guarde la revisión en curso.',
    updateApply: 'Actualizar',
    updateLater: 'Más tarde',
    offlineReady:
      'PERMA está lista para usarse sin conexión. El análisis de imágenes requiere conexión a la red.',
    offlineDismiss: 'Entendido',
  },
  en: {
    regionLabel: 'Application status',
    updateReady: 'A new version of PERMA is available.',
    updateBlocked:
      'A new version is available. You can update once the current review is finished or saved.',
    updateApply: 'Update',
    updateLater: 'Later',
    offlineReady:
      'PERMA is ready to work offline. Image analysis needs a network connection.',
    offlineDismiss: 'Got it',
  },
} as const satisfies FeatureCopy;

export type PwaCopyKey = keyof (typeof copy)['es'];
