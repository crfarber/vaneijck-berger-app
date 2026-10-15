import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./photo-camera.tsx', import.meta.url), 'utf8');

describe('photo camera wiring', () => {
  it('uses the tested capture session for the whole operation', () => {
    expect(source).toContain('captureSession.run({');
    expect(source).toContain('onBusyChange: setCapturing');
    expect(source).toContain('onCapture,');
    expect(source).toContain('onError: showCaptureError');
    expect(source).not.toContain('deliverCapture');
  });

  it('only enables native capture once the focused camera is ready', () => {
    expect(source).toContain('onCameraReady={() => {');
    expect(source).toContain('captureSession.setReady(true)');
    expect(source).toContain('disabled={captureDisabled}');
    expect(source).toContain('!useLibrary && !cameraReady');
  });

  it('handles camera initialization and lens discovery errors', () => {
    expect(source).toContain('onMountError={({ message }) => {');
    expect(source).toContain('captureSession.setReady(false)');
    expect(source).toContain("showCaptureError(new Error(message), 'initialize')");
    expect(source).toContain("stage: 'lenses'");
    expect(source).not.toContain('.catch(showCaptureError)');
  });

  it('distinguishes initialization, capture and save failures with safe diagnostics', () => {
    expect(source).toContain("initialize: 'photos.cameraStartFailed'");
    expect(source).toContain("capture: 'photos.captureFailed'");
    expect(source).toContain("save: 'photos.saveFailed'");
    expect(source).toContain('photoCaptureErrorType(error)');
    expect(source).toContain("logger?.warn('photos'");
    expect(source).not.toContain("t('common.somethingWrong')");
  });

  it('receives the application logger through the existing photos provider', () => {
    const providers = readFileSync(
      new URL('../../../bootstrap/providers.tsx', import.meta.url),
      'utf8',
    );
    expect(providers).toMatch(/<PhotosProvider[^>]*logger=\{container.logger\}/);
    expect(source).toContain('usePhotoLogger()');
  });

  it('reinitializes a busy native camera without automatically repeating the capture', () => {
    expect(source).toMatch(
      /if \(stage === 'capture' && errorType === 'CameraNotReadyException'\) \{\s*captureSession\.setReady\(false\);\s*setCameraReady\(false\);\s*setCameraGeneration\(\(current\) => current \+ 1\);\s*\}/,
    );
  });

  it('releases the native camera when the capture screen loses focus', () => {
    expect(source).toContain('useFocusEffect(');
    expect(source).toContain('setCameraFocused(false)');
    expect(source).toContain('cameraFocused && appActive ? (');
  });

  it('requires a newly initialized camera after returning from the background', () => {
    expect(source).toContain("AppState.addEventListener('change'");
    expect(source).toContain('captureSession.setReady(false)');
    expect(source).toContain('setCameraReady(false)');
    expect(source).toContain("setAppActive(state === 'active')");
    expect(source).toContain('!appActive');
    expect(source).toContain('setCameraGeneration((current) => current + 1)');
    expect(source).toContain('key={cameraGeneration}');
    expect(source).toContain('subscription.remove()');
  });
});
