import type { Tint } from './tints';

export type SystemLocale = 'es' | 'en';

export type UpliftCopy = {
  sectionChips: string;
  sectionTiles: string;
  sectionStepper: string;
  sectionHeadings: string;
  sectionEmpty: string;
  sectionDraw: string;
  sectionCardVariants: string;
  tintNames: Record<Tint, string>;
  selectable: string;
  stepLabels: Record<'contexto' | 'imagen' | 'analisis' | 'resultado' | 'observaciones' | 'revision', string>;
  stepperLabel: string;
  eyebrow: string;
  headingTitle: string;
  tileBody: string;
  emptyTitle: string;
  emptyBody: string;
  emptyAction: string;
  drawLabel: string;
  replay: string;
  cardOutline: string;
  cardSoft: string;
  cardRaised: string;
  cardInteractive: string;
};

export type SystemCopy = {
  uplift: UpliftCopy;
  title: string;
  languageLabel: string;
  navLabel: string;
  noticeLabel: string;
  notice: string;
  sectionButtons: string;
  sectionCards: string;
  sectionTabs: string;
  sectionAccordion: string;
  sectionSheet: string;
  sectionNav: string;
  sectionScores: string;
  sectionFeedback: string;
  variants: { primary: string; secondary: string; quiet: string; danger: string; soft: string };
  states: { default: string; pressed: string; disabled: string; loading: string };
  iconLabel: string;
  focusDemo: string;
  badgeSimulated: string;
  bentoTitle: string;
  bentoBody: string;
  protocolTitle: string;
  protocolBody: string;
  tabsLabel: string;
  tabs: { image: string; model: string; notes: string };
  tabImageBody: string;
  tabModelBody: string;
  tabNotesBody: string;
  abcdeLabel: string;
  abcdeStatus: string;
  criteria: { letter: string; title: string }[];
  openSheet: string;
  sheetTitle: string;
  sheetBody: string;
  closeSheet: string;
  navItems: { escritorio: string; examinar: string; revision: string; guia: string };
  scoreLabel: (index: number) => string;
  scoreAxis: string;
  statusDemo: string;
  statusDone: string;
  dropLabel: string;
  dropHint: string;
  dropButton: string;
  dropReceived: (count: number) => string;
  loadingDemo: string;
};

const ES: SystemCopy = {
  title: 'Sistema de componentes de VERA',
  languageLabel: 'Idioma',
  navLabel: 'Navegación principal',
  noticeLabel: 'Aviso del prototipo',
  notice: 'Esta es una herramienta de IA en investigación. No reemplaza la valoración clínica ni emite diagnósticos.',
  sectionButtons: 'Botones',
  sectionCards: 'Tarjetas',
  sectionTabs: 'Vistas',
  sectionAccordion: 'Criterios ABCDE',
  sectionSheet: 'Hoja inferior',
  sectionNav: 'Navegación',
  sectionScores: 'Puntajes relativos',
  sectionFeedback: 'Estado y archivo',
  variants: { primary: 'Principal', secondary: 'Secundario', quiet: 'Discreto', danger: 'Peligro', soft: 'Suave' },
  states: { default: 'Reposo', pressed: 'Presionado', disabled: 'Deshabilitado', loading: 'Cargando' },
  iconLabel: 'Opciones de la imagen',
  focusDemo: 'Foco',
  badgeSimulated: 'Modelo simulado',
  bentoTitle: 'Empiece por una imagen.',
  bentoBody: 'Puede registrar el contexto y sus observaciones.',
  protocolTitle: 'Protocolo',
  protocolBody: 'Alcance y límites',
  tabsLabel: 'Vistas de la imagen',
  tabs: { image: 'Imagen', model: 'Salida del modelo', notes: 'Mis observaciones' },
  tabImageBody: 'Imagen de referencia sin modificar.',
  tabModelBody: 'Puntajes relativos del modelo experimental.',
  tabNotesBody: 'Sus observaciones se registran aparte.',
  abcdeLabel: 'Criterios ABCDE',
  abcdeStatus: 'Sin evaluar',
  criteria: [
    { letter: 'A', title: 'Asimetría' },
    { letter: 'B', title: 'Borde' },
    { letter: 'C', title: 'Color' },
    { letter: 'D', title: 'Diámetro' },
    { letter: 'E', title: 'Evolución' },
  ],
  openSheet: 'Abrir hoja',
  sheetTitle: 'Sitio del cuerpo',
  sheetBody: 'Elija una ubicación general. No se realiza localización automática.',
  closeSheet: 'Cerrar',
  navItems: { escritorio: 'Escritorio', examinar: 'Examinar', revision: 'Revisión', guia: 'Guía' },
  scoreLabel: (index) => `Puntaje ${index}`,
  scoreAxis: 'Puntaje relativo de 0 a 1',
  statusDemo: 'Estado de ejemplo',
  statusDone: 'Acción completada.',
  dropLabel: 'Seleccione una imagen',
  dropHint: 'Puede arrastrarla aquí o usar el botón.',
  dropButton: 'Elegir archivo',
  dropReceived: (count) => `Archivos recibidos: ${count}`,
  loadingDemo: 'Cargando',
  uplift: {
    sectionChips: 'Etiquetas',
    sectionTiles: 'Mosaico e iconos',
    sectionStepper: 'Recorrido del examen',
    sectionHeadings: 'Encabezados',
    sectionEmpty: 'Estado vacío',
    sectionDraw: 'Confirmación',
    sectionCardVariants: 'Variantes de tarjeta',
    tintNames: { mint: 'Menta', sky: 'Cielo', butter: 'Mantequilla', blush: 'Rubor', lilac: 'Lila' },
    selectable: 'Seleccionable',
    stepLabels: {
      contexto: 'Contexto',
      imagen: 'Imagen',
      analisis: 'Análisis',
      resultado: 'Resultado',
      observaciones: 'Observaciones',
      revision: 'Revisión',
    },
    stepperLabel: 'Recorrido del examen',
    eyebrow: 'Paso 2 de 6',
    headingTitle: 'Imagen',
    tileBody: 'Texto breve de este paso, sin estados ni puntajes.',
    emptyTitle: 'Todavía no hay observaciones.',
    emptyBody: 'Las observaciones aparecen aquí cuando se registran.',
    emptyAction: 'Registrar observación',
    drawLabel: 'Exportación completada',
    replay: 'Repetir animación',
    cardOutline: 'Contorno suave',
    cardSoft: 'Color suave',
    cardRaised: 'Elevada',
    cardInteractive: 'Interactiva',
  },
};

const EN: SystemCopy = {
  title: 'VERA component system',
  languageLabel: 'Language',
  navLabel: 'Main navigation',
  noticeLabel: 'Prototype notice',
  notice: 'This is an AI research tool. It does not replace clinical assessment or provide diagnoses.',
  sectionButtons: 'Buttons',
  sectionCards: 'Cards',
  sectionTabs: 'Views',
  sectionAccordion: 'ABCDE criteria',
  sectionSheet: 'Bottom sheet',
  sectionNav: 'Navigation',
  sectionScores: 'Relative scores',
  sectionFeedback: 'Status and file',
  variants: { primary: 'Primary', secondary: 'Secondary', quiet: 'Quiet', danger: 'Danger', soft: 'Soft' },
  states: { default: 'Default', pressed: 'Pressed', disabled: 'Disabled', loading: 'Loading' },
  iconLabel: 'Image options',
  focusDemo: 'Focus',
  badgeSimulated: 'Simulated model',
  bentoTitle: 'Start with an image.',
  bentoBody: 'You can record the context and your observations.',
  protocolTitle: 'Protocol',
  protocolBody: 'Scope and limits',
  tabsLabel: 'Image views',
  tabs: { image: 'Image', model: 'Model output', notes: 'My observations' },
  tabImageBody: 'Unmodified reference image.',
  tabModelBody: 'Relative experimental model scores.',
  tabNotesBody: 'Your observations are recorded separately.',
  abcdeLabel: 'ABCDE criteria',
  abcdeStatus: 'Not evaluated',
  criteria: [
    { letter: 'A', title: 'Asymmetry' },
    { letter: 'B', title: 'Border' },
    { letter: 'C', title: 'Color' },
    { letter: 'D', title: 'Diameter' },
    { letter: 'E', title: 'Evolution' },
  ],
  openSheet: 'Open sheet',
  sheetTitle: 'Body site',
  sheetBody: 'Choose a general location. No automatic localization is performed.',
  closeSheet: 'Close',
  navItems: { escritorio: 'Desk', examinar: 'Inspect', revision: 'Review', guia: 'Guide' },
  scoreLabel: (index) => `Score ${index}`,
  scoreAxis: 'Relative score from 0 to 1',
  statusDemo: 'Example status',
  statusDone: 'Action completed.',
  dropLabel: 'Choose an image',
  dropHint: 'You can drag it here or use the button.',
  dropButton: 'Choose file',
  dropReceived: (count) => `Files received: ${count}`,
  loadingDemo: 'Loading',
  uplift: {
    sectionChips: 'Labels',
    sectionTiles: 'Tiles and icons',
    sectionStepper: 'Exam journey',
    sectionHeadings: 'Headings',
    sectionEmpty: 'Empty state',
    sectionDraw: 'Confirmation',
    sectionCardVariants: 'Card variants',
    tintNames: { mint: 'Mint', sky: 'Sky', butter: 'Butter', blush: 'Blush', lilac: 'Lilac' },
    selectable: 'Selectable',
    stepLabels: {
      contexto: 'Context',
      imagen: 'Image',
      analisis: 'Analysis',
      resultado: 'Result',
      observaciones: 'Observations',
      revision: 'Review',
    },
    stepperLabel: 'Exam journey',
    eyebrow: 'Step 2 of 6',
    headingTitle: 'Image',
    tileBody: 'Short text for this step, with no states or scores.',
    emptyTitle: 'No observations yet.',
    emptyBody: 'Observations appear here once recorded.',
    emptyAction: 'Record observation',
    drawLabel: 'Export completed',
    replay: 'Replay animation',
    cardOutline: 'Soft outline',
    cardSoft: 'Soft color',
    cardRaised: 'Raised',
    cardInteractive: 'Interactive',
  },
};

export const SYSTEM_COPY: Record<SystemLocale, SystemCopy> = { es: ES, en: EN };
