import type { Haptics, Scheduler } from '@/shared/platform/ports';

export const DEFAULT_PRESS_LOCK_MS = 400;

export type GuardedPressDeps = {
  scheduler: Scheduler;
  haptics: Haptics;
  lockMs?: number;
};

export type GuardedPress = {
  /** Leading-edge lock: first press runs, further presses within `lockMs` are ignored. */
  handle(input: { onPress: () => void; disabled?: boolean; haptic?: boolean }): void;
  dispose(): void;
};

/** Pure press guard so button double-taps can be tested without React. */
export function createGuardedPress(deps: GuardedPressDeps): GuardedPress {
  const lockMs = deps.lockMs ?? DEFAULT_PRESS_LOCK_MS;
  let locked = false;
  let cancelUnlock: (() => void) | null = null;

  const clearUnlock = (): void => {
    cancelUnlock?.();
    cancelUnlock = null;
  };

  return {
    handle({ onPress, disabled = false, haptic = true }) {
      if (disabled || locked) {
        return;
      }
      locked = true;
      if (haptic) {
        deps.haptics.tap();
      }
      onPress();
      clearUnlock();
      cancelUnlock = deps.scheduler.schedule(() => {
        locked = false;
        cancelUnlock = null;
      }, lockMs);
    },
    dispose() {
      clearUnlock();
      locked = false;
    },
  };
}
