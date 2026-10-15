import { describe, expect, it, vi } from 'vitest';
import { deferred } from '@/test/fakes';
import { createPhotoCapture, photoCaptureErrorType } from './photo-capture';

function setup() {
  const session = createPhotoCapture();
  const input = {
    capture: vi.fn(async (): Promise<string | null> => 'file:///camera/photo.jpg'),
    onCapture: vi.fn(async (): Promise<void> => undefined),
    onBusyChange: vi.fn(),
    onError: vi.fn(),
  };
  return { session, input };
}

describe('photo capture', () => {
  it('identifies native camera errors without exposing their full message', () => {
    const error = new Error('CameraNotReadyException: file:///private/photo.jpg user@example.test');
    expect(photoCaptureErrorType(error)).toBe('CameraNotReadyException');
  });

  it('identifies runtime errors without exposing their message', () => {
    expect(photoCaptureErrorType(new TypeError('secret value'))).toBe('TypeError');
  });

  it('does not expose arbitrary names or rejected values', () => {
    const error = new Error('secret value');
    error.name = 'user@example.test';
    expect(photoCaptureErrorType(error)).toBe('UnknownError');
    expect(photoCaptureErrorType('secret value')).toBe('UnknownError');
    expect(photoCaptureErrorType(null)).toBe('UnknownError');
  });

  it('allows library selection without a native camera ready event', async () => {
    const { input } = setup();
    await createPhotoCapture(true).run(input);
    expect(input.capture).toHaveBeenCalledTimes(1);
    expect(input.onCapture).toHaveBeenCalledTimes(1);
  });

  it('ignores captures before the camera is ready', async () => {
    const { session, input } = setup();
    await session.run(input);
    expect(input.capture).not.toHaveBeenCalled();
    expect(input.onBusyChange).not.toHaveBeenCalled();
  });

  it('shows busy immediately and blocks repeated presses until the photo is saved', async () => {
    const { session, input } = setup();
    const picture = deferred<string | null>();
    const saved = deferred<void>();
    const savingStarted = deferred<void>();
    input.capture.mockReturnValue(picture.promise);
    input.onCapture.mockImplementation(() => {
      savingStarted.resolve();
      return saved.promise;
    });
    session.setReady(true);

    const capturing = session.run(input);
    expect(input.onBusyChange.mock.calls).toEqual([[true]]);
    await session.run(input);
    expect(input.capture).toHaveBeenCalledTimes(1);

    picture.resolve('file:///camera/photo.jpg');
    await savingStarted.promise;
    expect(input.onCapture).toHaveBeenCalledTimes(1);
    await session.run(input);
    expect(input.capture).toHaveBeenCalledTimes(1);
    expect(input.onBusyChange.mock.calls).toEqual([[true]]);

    saved.resolve();
    await capturing;
    expect(input.onBusyChange.mock.calls).toEqual([[true], [false]]);
    expect(input.onCapture).toHaveBeenCalledWith('file:///camera/photo.jpg');
  });

  it('allows another capture when the previous one has finished', async () => {
    const { session, input } = setup();
    session.setReady(true);
    await session.run(input);
    await session.run(input);
    expect(input.capture).toHaveBeenCalledTimes(2);
  });

  it('blocks captures again when the camera becomes unavailable', async () => {
    const { session, input } = setup();
    session.setReady(true);
    session.setReady(false);
    await session.run(input);
    expect(input.capture).not.toHaveBeenCalled();
  });

  it('catches native camera errors and allows another attempt', async () => {
    const { session, input } = setup();
    const error = new Error('Camera not ready');
    input.capture.mockRejectedValueOnce(error);
    session.setReady(true);
    await session.run(input);
    expect(input.onError).toHaveBeenCalledWith(error, 'capture');
    expect(input.onCapture).not.toHaveBeenCalled();
    expect(input.onBusyChange.mock.calls).toEqual([[true], [false]]);
    await session.run(input);
    expect(input.onCapture).toHaveBeenCalledTimes(1);
  });

  it('catches storage errors without leaving capture locked', async () => {
    const { session, input } = setup();
    const error = new Error('Storage unavailable');
    input.onCapture.mockRejectedValueOnce(error);
    session.setReady(true);
    await session.run(input);
    expect(input.onError).toHaveBeenCalledWith(error, 'save');
    expect(input.onBusyChange.mock.calls).toEqual([[true], [false]]);
    await session.run(input);
    expect(input.onCapture).toHaveBeenCalledTimes(2);
  });

  it('does not save or report an error when library selection is cancelled', async () => {
    const { session, input } = setup();
    session.setReady(true);
    input.capture.mockResolvedValueOnce(null);
    await session.run(input);
    expect(input.onCapture).not.toHaveBeenCalled();
    expect(input.onError).not.toHaveBeenCalled();
    expect(input.onBusyChange.mock.calls).toEqual([[true], [false]]);
    await session.run(input);
    expect(input.onCapture).toHaveBeenCalledTimes(1);
  });
});
