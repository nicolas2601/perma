import type { PdfBlock } from './pdfContent';
import { toWinAnsi, wrapText } from './pdfText';

const PAGE_MARGIN = 56;
const FONT_SIZE: Record<PdfBlock['kind'], number> = { title: 18, heading: 12, notice: 10, line: 10 };
const LINE_GAP = 4;
const HEADING_SPACE_BEFORE = 12;

/**
 * Renders printable blocks to an A4 PDF. pdf-lib loads on demand through a
 * dynamic import, so it stays out of the initial bundle.
 */
export async function renderPdf(blocks: readonly PdfBlock[]): Promise<Uint8Array<ArrayBuffer>> {
  const { PDFDocument, PageSizes, StandardFonts } = await import('pdf-lib');
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const [pageWidth, pageHeight] = PageSizes.A4;
  const maxWidth = pageWidth - PAGE_MARGIN * 2;
  const top = pageHeight - PAGE_MARGIN;

  let page = doc.addPage(PageSizes.A4);
  let y = top;

  for (const block of blocks) {
    const size = FONT_SIZE[block.kind];
    const font = block.kind === 'title' || block.kind === 'heading' ? bold : regular;
    if (block.kind === 'heading') y -= HEADING_SPACE_BEFORE;
    const measure = (text: string): number => font.widthOfTextAtSize(text, size);
    for (const line of wrapText(toWinAnsi(block.text), measure, maxWidth)) {
      const height = size + LINE_GAP;
      if (y - height < PAGE_MARGIN) {
        page = doc.addPage(PageSizes.A4);
        y = top;
      }
      y -= height;
      page.drawText(line, { x: PAGE_MARGIN, y, size, font });
    }
  }
  return new Uint8Array(await doc.save());
}
