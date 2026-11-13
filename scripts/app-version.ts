import { readFileSync } from 'node:fs';

/** Single source for the app version: package.json, injected at build time as __APP_VERSION__. */
export const APP_VERSION: string = (
  JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')) as { version: string }
).version;
