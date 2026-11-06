// Shared helpers for PERMA mark concepts. viewBox is always 0 0 64 64 (4 px safe margin).
export const VB = 64;
export function wrap({ title, desc, body, tile, tileFill = 'none' }) {
  const bg = tile ? `<rect width="64" height="64" rx="14" fill="${tileFill}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${VB} ${VB}" role="img" aria-labelledby="t d"><title id="t">${title}</title><desc id="d">${desc}</desc>${bg}${body}</svg>\n`;
}
