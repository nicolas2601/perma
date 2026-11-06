import { MotionProvider } from '@/core/motion';
import { AppProviders } from './providers';
import { Router, useRouter } from './router';
import { routes } from './routes';
import { UpdatePrompt } from './pwa/UpdatePrompt';
import { useI18n } from '@/core/i18n/I18nProvider';

function NotFound() {
  return <main className="p-4">404</main>;
}

const EDITING_PATH_PREFIX = '/examen/abcde';

function Shell() {
  const { locale } = useI18n();
  const { location } = useRouter();
  return <UpdatePrompt canReload={!location.path.startsWith(EDITING_PATH_PREFIX)} locale={locale} />;
}

export function App() {
  return (
    <AppProviders>
      <MotionProvider>
        <Router routes={routes} fallback={NotFound}>
          <Shell />
        </Router>
      </MotionProvider>
    </AppProviders>
  );
}
