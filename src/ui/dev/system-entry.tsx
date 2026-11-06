import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/geist';
import '../../styles/tokens.css';
import { SystemPage } from '../SystemPage';

/* Dev-only mount of the internal kit page. Not imported by src/app, so it never ships in the production bundle. */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SystemPage />
  </StrictMode>,
);
