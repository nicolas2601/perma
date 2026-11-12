/**
 * The only module that touches vite-plugin-pwa's virtual registration module.
 * Kept separate so unit tests can mock it (Vitest does not load the PWA plugin).
 */
export { useRegisterSW } from 'virtual:pwa-register/react';
