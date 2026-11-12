import { useEffect } from 'react';
import { useNavigate } from '@/app/router';

/** Redirects to a legal route when the required state is absent (architecture G10). */
export function useGuard(allowed: boolean, fallbackPath: string): void {
  const navigate = useNavigate();
  useEffect(() => {
    if (!allowed) navigate(fallbackPath, { replace: true });
  }, [allowed, fallbackPath, navigate]);
}
