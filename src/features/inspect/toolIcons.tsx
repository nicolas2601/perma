import expandSvg from '@/assets/icons/expand.svg';
import infoSvg from '@/assets/icons/info.svg';
import layersSvg from '@/assets/icons/layers.svg';
import plusSvg from '@/assets/icons/plus.svg';

const TOOL_ICON_CLASS = 'size-5 shrink-0';

/** Decorative tool glyphs from src/assets/icons (currentColor ink). Names live on the buttons. */
export function ExpandIcon() {
  return <img src={expandSvg} alt="" aria-hidden="true" className={TOOL_ICON_CLASS} />;
}

export function PlusIcon() {
  return <img src={plusSvg} alt="" aria-hidden="true" className={TOOL_ICON_CLASS} />;
}

export function LayersIcon() {
  return <img src={layersSvg} alt="" aria-hidden="true" className={TOOL_ICON_CLASS} />;
}

export function InfoGlyphIcon() {
  return <img src={infoSvg} alt="" aria-hidden="true" className={TOOL_ICON_CLASS} />;
}
