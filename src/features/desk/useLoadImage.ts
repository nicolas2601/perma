import { useState } from 'react';
import type { ExamImage } from '@/core/exam/contract';
import { useNavigate } from '@/app/router';
import { useExamDispatch } from '@/core/exam/react';
import { ImageRejectedError } from './imageFile';
import { isMockFault } from './mockFault';
import { QUALITY_PATH, RECOVERY_PATHS } from './recoveryPaths';

export interface LoadImage {
  busy: boolean;
  /**
   * Runs a loader, stores the image and opens quality. Any failure dispatches the
   * file-unavailable fault (legal from capturing) and opens its recovery page.
   */
  run: (load: () => Promise<ExamImage>) => Promise<void>;
}

export function useLoadImage(search: string = window.location.search): LoadImage {
  const navigate = useNavigate();
  const dispatch = useExamDispatch();
  const [busy, setBusy] = useState(false);
  const run = async (load: () => Promise<ExamImage>): Promise<void> => {
    setBusy(true);
    try {
      if (isMockFault(search, 'file-unavailable')) throw new ImageRejectedError('decode');
      const image = await load();
      dispatch({ type: 'IMAGE_LOADED', image });
      navigate(QUALITY_PATH);
    } catch {
      dispatch({ type: 'FAULT', scenario: 'file-unavailable' });
      navigate(RECOVERY_PATHS['file-unavailable']);
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}
