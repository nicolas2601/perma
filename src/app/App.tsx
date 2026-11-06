import { Router } from './router';
import { routes } from './routes';

function NotFound() {
  return <main className="p-4">404</main>;
}

export function App() {
  return <Router routes={routes} fallback={NotFound} />;
}
