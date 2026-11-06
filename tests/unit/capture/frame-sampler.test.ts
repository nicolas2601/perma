import { describe, expect, it, vi } from 'vitest';
import { captureGuideCrop, createVideoFrameScheduler, guideCropRect } from '@/core/capture/frame-sampler';
import { GUIDE_CROP_FRACTION } from '@/core/capture/constants';

describe('guide crop', () => {
  it('is a centred square at 72% of the shorter side', () => {
    const rect = guideCropRect(1280, 720);
    const side = Math.floor(720 * GUIDE_CROP_FRACTION);
    expect(rect).toEqual({ sx: Math.floor((1280 - side) / 2), sy: Math.floor((720 - side) / 2), side });
  });

  it('returns null while the video has no usable size', () => {
    expect(guideCropRect(0, 0)).toBeNull();
    expect(guideCropRect(8, 8)).toBeNull();
  });

  it('draws the crop into the analysis canvas and reads the pixels back', () => {
    const drawImage = vi.fn();
    const buffer = new ArrayBuffer(128 * 128 * 4);
    const video = { videoWidth: 640, videoHeight: 480 } as unknown as HTMLVideoElement;
    expect(captureGuideCrop({ drawImage, readRgba: () => buffer }, video)).toBe(buffer);
    expect(drawImage).toHaveBeenCalledWith(video, expect.any(Number), expect.any(Number), expect.any(Number), expect.any(Number), 0, 0, 128, 128);
  });

  it('returns null without drawing when the video has no size', () => {
    const drawImage = vi.fn();
    const video = { videoWidth: 0, videoHeight: 0 } as unknown as HTMLVideoElement;
    expect(captureGuideCrop({ drawImage, readRgba: () => null }, video)).toBeNull();
    expect(drawImage).not.toHaveBeenCalled();
  });
});

describe('frame scheduler', () => {
  it('uses requestVideoFrameCallback and cancels it on stop', () => {
    const callbacks: (() => void)[] = [];
    const video = {
      requestVideoFrameCallback: vi.fn((cb: () => void) => { callbacks.push(cb); return callbacks.length; }),
      cancelVideoFrameCallback: vi.fn(),
    } as unknown as HTMLVideoElement;
    const tick = vi.fn();
    const scheduler = createVideoFrameScheduler(video);
    scheduler.start(tick);
    callbacks[0]?.();
    expect(tick).toHaveBeenCalledTimes(1);
    expect(video.requestVideoFrameCallback).toHaveBeenCalledTimes(2);
    scheduler.stop();
    expect(video.cancelVideoFrameCallback).toHaveBeenCalledWith(2);
    callbacks[1]?.();
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it('falls back to requestAnimationFrame when the video lacks requestVideoFrameCallback', () => {
    const raf = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(() => 7);
    const caf = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => undefined);
    const scheduler = createVideoFrameScheduler({} as HTMLVideoElement);
    scheduler.start(() => undefined);
    expect(raf).toHaveBeenCalledTimes(1);
    scheduler.stop();
    expect(caf).toHaveBeenCalledWith(7);
  });
});
