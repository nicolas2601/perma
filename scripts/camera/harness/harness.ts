// Bench-only page (not routed in the app). Opens the camera (a Chromium fake device fed by a y4m file),
// runs the real capture advisor with its real module worker, and records every analyzed frame's raw
// candidate plus every advice change. The driver (scripts/camera/run-harness.mjs) reads `window.__harness`.
import { createCaptureAdvisor } from '../../../src/core/capture/create-capture-advisor';
import type { Advice, AdviceId } from '../../../src/core/capture/types';
import { createModuleWorker } from '../../../src/features/camera/guide/create-module-worker';

interface CandidateSample {
  readonly media: number;
  readonly candidate: AdviceId;
  readonly abstained: boolean;
}

interface AdviceSample {
  readonly media: number;
  readonly id: AdviceId;
  readonly mode: Advice['mode'];
}

interface HarnessState {
  ready: boolean;
  error: string | null;
  candidates: CandidateSample[];
  advice: AdviceSample[];
}

const state: HarnessState = { ready: false, error: null, candidates: [], advice: [] };
(window as unknown as { __harness: HarnessState }).__harness = state;

async function main(): Promise<void> {
  const video = document.getElementById('feed') as HTMLVideoElement;
  video.srcObject = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, frameRate: 10 } });
  await video.play();
  const advisor = createCaptureAdvisor({
    createWorker: createModuleWorker,
    onCandidate: (candidate, abstained) => state.candidates.push({ media: video.currentTime, candidate, abstained }),
  });
  advisor.subscribe(advice => state.advice.push({ media: video.currentTime, id: advice.id, mode: advice.mode }));
  advisor.start(video);
  state.ready = true;
}

main().catch((error: unknown) => {
  state.error = error instanceof Error ? error.message : String(error);
  state.ready = true;
});
