/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_INFERENCE?: 'live' | 'mock';
  readonly VITE_DEFAULT_MODEL?: string;
  readonly VITE_API_ORIGIN?: string;
}
