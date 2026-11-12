import { useEffect, useRef, useState, type RefObject } from 'react';
import { createCaptureAdvisor, type CaptureAdvisorOptions } from '@/core/capture/create-capture-advisor';
import type { Advice } from '@/core/capture/types';
import { createModuleWorker } from './create-module-worker';

/**
 * Live advice for a video element. Starts when the element is mounted and stops on unmount.
 * `options` is read once per mount (tests inject fakes); the default worker is the module worker.
 * Frames stay on the device: nothing is uploaded, stored or logged.
 */
export function useCaptureAdvice(
  videoRef: RefObject<HTMLVideoElement | null>,
  options: Partial<CaptureAdvisorOptions> = {},
): Advice | null {
  const [advice, setAdvice] = useState<Advice | null>(null);
  const optionsRef = useRef(options);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return undefined;
    const advisor = createCaptureAdvisor({ createWorker: createModuleWorker, ...optionsRef.current });
    const unsubscribe = advisor.subscribe(setAdvice);
    advisor.start(video);
    return () => {
      unsubscribe();
      advisor.stop();
    };
  }, [videoRef]);
  return advice;
}
