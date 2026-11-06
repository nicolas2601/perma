import exportDoneSvg from '@/assets/illustrations/export-done.svg?raw';

const SVG_OPEN_TAG = '<svg ';
/** The static file has no class on its root; `ill-animate` enables the one-time draw-on. */
const ANIMATED_MARKUP = exportDoneSvg.replace(SVG_OPEN_TAG, `${SVG_OPEN_TAG}class="ill-animate" `);

/**
 * Export-done art inlined so the check can draw on once (reduced motion shows the final state,
 * handled by the SVG's own media query). Decorative: the heading already states the outcome.
 */
export function ExportDoneArt() {
  return (
    <div
      aria-hidden="true"
      className="flex justify-center [&_svg]:h-30 [&_svg]:w-auto lg:[&_svg]:h-40"
      dangerouslySetInnerHTML={{ __html: ANIMATED_MARKUP }}
    />
  );
}
