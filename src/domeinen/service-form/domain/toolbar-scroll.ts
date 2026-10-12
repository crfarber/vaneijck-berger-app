/** Upward travel that brings a hidden toolbar back. Downward travel hides it at once. */
export const TOOLBAR_REVEAL_DISTANCE = 10;

/** Offsets smaller than this are finger jitter, not a direction change. */
const SCROLL_NOISE = 0.5;

export type ToolbarScrollState = {
  offsetY: number;
  /** Upward pixels gathered while the toolbar is hidden. */
  upwardTravel: number;
  visible: boolean;
};

export function createToolbarScrollState(): ToolbarScrollState {
  return { offsetY: 0, upwardTravel: 0, visible: true };
}

/**
 * Hide the toolbar while the form scrolls down. Show it again after a short upward move,
 * and always when the scroll position is back at the top.
 */
export function reduceToolbarScroll(
  state: ToolbarScrollState,
  offsetY: number,
): ToolbarScrollState {
  const y = offsetY < 0 ? 0 : offsetY;
  if (y === 0) {
    if (state.offsetY === 0 && state.upwardTravel === 0 && state.visible) {
      return state;
    }
    return { offsetY: 0, upwardTravel: 0, visible: true };
  }

  const delta = y - state.offsetY;
  if (Math.abs(delta) < SCROLL_NOISE) {
    return state;
  }

  if (delta > 0) {
    return { offsetY: y, upwardTravel: 0, visible: false };
  }

  if (state.visible) {
    return { offsetY: y, upwardTravel: 0, visible: true };
  }

  const upwardTravel = state.upwardTravel - delta;
  if (upwardTravel >= TOOLBAR_REVEAL_DISTANCE) {
    return { offsetY: y, upwardTravel: 0, visible: true };
  }
  return { offsetY: y, upwardTravel, visible: false };
}
