/// <reference types="vite/client" />
declare const __APP_VERSION__: string;
interface ImportMetaEnv {
  readonly VITE_INFERENCE?: 'live' | 'mock';
  readonly VITE_DEFAULT_MODEL?: string;
  readonly VITE_API_ORIGIN?: string;
}
