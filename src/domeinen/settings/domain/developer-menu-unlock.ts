/** How many taps on the worker identity unlock sync/debug in settings. */
export const DEVELOPER_MENU_UNLOCK_TAPS = 8;

/** Idle gap after which the tap streak resets. */
export const DEVELOPER_MENU_UNLOCK_RESET_MS = 2_000;

export type DeveloperMenuUnlockProgress = {
  readonly tapCount: number;
  readonly unlocked: boolean;
};

/**
 * Advances the secret tap streak. When the required count is reached, unlocks and resets
 * the streak. Callers clear the streak themselves after `DEVELOPER_MENU_UNLOCK_RESET_MS`.
 */
export function registerDeveloperMenuTap(
  current: DeveloperMenuUnlockProgress,
  requiredTaps: number = DEVELOPER_MENU_UNLOCK_TAPS,
): DeveloperMenuUnlockProgress {
  if (current.unlocked) {
    return current;
  }
  const tapCount = current.tapCount + 1;
  if (tapCount >= requiredTaps) {
    return { tapCount: 0, unlocked: true };
  }
  return { tapCount, unlocked: false };
}
