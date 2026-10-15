export type PhotoCaptureStage = 'capture' | 'save';

export function photoCaptureErrorType(error: unknown): string {
  if (!(error instanceof Error)) return 'UnknownError';
  for (const errorType of ['CameraNotReadyException', 'CameraImageCaptureException']) {
    if (error.name === errorType || error.message.includes(errorType)) return errorType;
  }
  return ['Error', 'TypeError', 'RangeError', 'SyntaxError', 'ReferenceError', 'URIError'].includes(
    error.name,
  )
    ? error.name
    : 'UnknownError';
}

type CaptureInput = {
  capture: () => Promise<string | null>;
  onCapture: (uri: string) => Promise<void>;
  onBusyChange: (busy: boolean) => void;
  onError: (error: unknown, stage: PhotoCaptureStage) => void;
};

export function createPhotoCapture(initiallyReady = false) {
  let ready = initiallyReady;
  let capturing = false;

  return {
    setReady(value: boolean): void {
      ready = value;
    },
    async run(input: CaptureInput): Promise<void> {
      if (!ready || capturing) return;
      capturing = true;
      let stage: PhotoCaptureStage = 'capture';
      try {
        input.onBusyChange(true);
        const uri = await input.capture();
        if (uri !== null) {
          stage = 'save';
          await input.onCapture(uri);
        }
      } catch (error) {
        input.onError(error, stage);
      } finally {
        capturing = false;
        input.onBusyChange(false);
      }
    },
  };
}
