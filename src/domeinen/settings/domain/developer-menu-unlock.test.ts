import { describe, expect, it } from 'vitest';
import { DEVELOPER_MENU_UNLOCK_TAPS, registerDeveloperMenuTap } from './developer-menu-unlock';

describe('registerDeveloperMenuTap', () => {
  it('counts taps until the unlock threshold', () => {
    let state = { tapCount: 0, unlocked: false };
    for (let i = 1; i < DEVELOPER_MENU_UNLOCK_TAPS; i += 1) {
      state = registerDeveloperMenuTap(state);
      expect(state).toEqual({ tapCount: i, unlocked: false });
    }
    expect(registerDeveloperMenuTap(state)).toEqual({ tapCount: 0, unlocked: true });
  });

  it('keeps unlocked state and ignores further taps', () => {
    expect(registerDeveloperMenuTap({ tapCount: 3, unlocked: true })).toEqual({
      tapCount: 3,
      unlocked: true,
    });
  });
});
