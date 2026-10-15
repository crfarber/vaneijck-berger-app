import { describe, expect, it, vi } from 'vitest';
import { createFakeScheduler } from '@/test/fakes';
import { createGuardedPress, DEFAULT_PRESS_LOCK_MS } from './guarded-press';

function createHaptics() {
  return { notify: vi.fn(), tap: vi.fn() };
}

describe('createGuardedPress', () => {
  it('runs the first press and taps once', () => {
    const scheduler = createFakeScheduler();
    const haptics = createHaptics();
    const onPress = vi.fn();
    const guard = createGuardedPress({ scheduler, haptics });

    guard.handle({ onPress });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(haptics.tap).toHaveBeenCalledTimes(1);
    expect(scheduler.pending()).toHaveLength(1);
    expect(scheduler.pending()[0]?.delayMs).toBe(DEFAULT_PRESS_LOCK_MS);
  });

  it('ignores a second press while locked', () => {
    const scheduler = createFakeScheduler();
    const haptics = createHaptics();
    const onPress = vi.fn();
    const guard = createGuardedPress({ scheduler, haptics });

    guard.handle({ onPress });
    guard.handle({ onPress });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(haptics.tap).toHaveBeenCalledTimes(1);
  });

  it('allows another press after the lock expires', async () => {
    const scheduler = createFakeScheduler();
    const haptics = createHaptics();
    const onPress = vi.fn();
    const guard = createGuardedPress({ scheduler, haptics });

    guard.handle({ onPress });
    await scheduler.fireNext();
    guard.handle({ onPress });

    expect(onPress).toHaveBeenCalledTimes(2);
    expect(haptics.tap).toHaveBeenCalledTimes(2);
  });

  it('does not run or tap when disabled', () => {
    const scheduler = createFakeScheduler();
    const haptics = createHaptics();
    const onPress = vi.fn();
    const guard = createGuardedPress({ scheduler, haptics });

    guard.handle({ onPress, disabled: true });

    expect(onPress).not.toHaveBeenCalled();
    expect(haptics.tap).not.toHaveBeenCalled();
    expect(scheduler.pending()).toHaveLength(0);
  });

  it('skips tap when haptic is false but still locks', () => {
    const scheduler = createFakeScheduler();
    const haptics = createHaptics();
    const onPress = vi.fn();
    const guard = createGuardedPress({ scheduler, haptics });

    guard.handle({ onPress, haptic: false });
    guard.handle({ onPress, haptic: false });

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(haptics.tap).not.toHaveBeenCalled();
  });

  it('cancels the unlock timer on dispose', () => {
    const scheduler = createFakeScheduler();
    const haptics = createHaptics();
    const guard = createGuardedPress({ scheduler, haptics });

    guard.handle({ onPress: () => undefined });
    expect(scheduler.pending()).toHaveLength(1);

    guard.dispose();

    expect(scheduler.timers[0]?.cancelled).toBe(true);
    expect(scheduler.pending()).toHaveLength(0);
  });
});
