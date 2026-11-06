import type { FeatureCopy } from './contract';

/** Copy owned by Core-State: the persistent notice, export labels and storage flags. */
export const coreCopy = {
  es: {
    'core.notice.experimental':
      'Prototipo experimental de investigación. Los puntajes no son probabilidades clínicas. No diagnostica.',
    'core.badge.simulated': 'Modelo simulado',
    'core.abcde.unanswered': 'Sin evaluar',
    'core.source.live': 'En vivo',
    'core.source.mock': 'Modelo simulado',
    'core.storage.memory': 'Los datos solo se guardan durante esta sesión.',
    'core.locale.es': 'Español',
    'core.locale.en': 'English',
    'core.export.title': 'Registro de examen',
    'core.export.recordId': 'Identificador del registro',
    'core.export.exportedAt': 'Fecha de exportación',
    'core.export.modelSource': 'Origen del modelo',
    'core.export.image': 'Imagen',
    'core.export.noImage': 'Sin imagen',
    'core.export.noResult': 'Sin salida del modelo',
    'core.export.scores': 'Puntajes crudos',
    'core.export.observations': 'Observaciones ABCDE',
    'core.export.note': 'Nota',
    'core.export.failed': 'No se pudo generar el archivo.',
  },
  en: {
    'core.notice.experimental':
      'Experimental research prototype. Scores are not clinical probabilities. It does not diagnose.',
    'core.badge.simulated': 'Simulated model',
    'core.abcde.unanswered': 'Not evaluated',
    'core.source.live': 'Live',
    'core.source.mock': 'Simulated model',
    'core.storage.memory': 'Data is kept for this session only.',
    'core.locale.es': 'Español',
    'core.locale.en': 'English',
    'core.export.title': 'Exam record',
    'core.export.recordId': 'Record identifier',
    'core.export.exportedAt': 'Export date',
    'core.export.modelSource': 'Model source',
    'core.export.image': 'Image',
    'core.export.noImage': 'No image',
    'core.export.noResult': 'No model output',
    'core.export.scores': 'Raw scores',
    'core.export.observations': 'ABCDE observations',
    'core.export.note': 'Note',
    'core.export.failed': 'The file could not be generated.',
  },
} as const satisfies FeatureCopy;

export type CoreCopyKey = keyof typeof coreCopy.es;
