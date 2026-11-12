export class CameraDeniedError extends Error {
  constructor() {
    super('camera permission denied');
    this.name = 'CameraDeniedError';
  }
}

export class CameraUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super('camera unavailable', options);
    this.name = 'CameraUnavailableError';
  }
}

const DENIED_ERRORS = new Set(['NotAllowedError', 'SecurityError', 'PermissionDeniedError']);
const FRAME_JPEG_QUALITY = 0.92;

function isDenial(error: unknown): boolean {
  return error instanceof DOMException && DENIED_ERRORS.has(error.name);
}

/** Opens the rear camera. Denial and absence of the API are typed separately. */
export async function openCamera(): Promise<MediaStream> {
  const devices = navigator.mediaDevices;
  if (!devices?.getUserMedia) throw new CameraUnavailableError();
  try {
    return await devices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
  } catch (cause) {
    if (isDenial(cause)) throw new CameraDeniedError();
    throw new CameraUnavailableError({ cause });
  }
}

/** Stops every track so the camera indicator turns off when the user leaves. */
export function stopStream(stream: MediaStream | null): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/** Draws the current video frame to a JPEG blob. Frames are never stored or uploaded by the app. */
export function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx || canvas.width === 0) return Promise.reject(new CameraUnavailableError());
  ctx.drawImage(video, 0, 0);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new CameraUnavailableError())),
      'image/jpeg',
      FRAME_JPEG_QUALITY,
    );
  });
}
