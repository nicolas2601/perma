import { useState } from 'react';
import type { ExamImage } from '@/core/exam/contract';
import { useNavigate } from '@/app/router';
import { useExamDispatch } from './api';
import { QUALITY_PATH, RECOVERY_PATHS } from './recoveryPaths';

export interface LoadImage {
  busy: boolean;
  /** Runs a loader, stores the image and opens quality. Any failure opens the file-unavailable recovery. */
  run: (load: () => Promise<ExamImage>) => Promise<void>;
}

export function useLoadImage(): LoadImage {
  const navigate = useNavigate();
  const dispatch = useExamDispatch();
  const [busy, setBusy] = useState(false);
  const run = async (load: () => Promise<ExamImage>): Promise<void> => {
    setBusy(true);
    try {
      const image = await load();
      dispatch({ type: 'IMAGE_LOADED', image });
      navigate(QUALITY_PATH);
    } catch {
      navigate(RECOVERY_PATHS['file-unavailable']);
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}
