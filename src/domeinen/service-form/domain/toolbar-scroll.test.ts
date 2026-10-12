import { describe, expect, it } from 'vitest';
import {
  TOOLBAR_REVEAL_DISTANCE,
  createToolbarScrollState,
  reduceToolbarScroll,
  type ToolbarScrollState,
} from './toolbar-scroll';

function scroll(state: ToolbarScrollState, offsetY: number): ToolbarScrollState {
  return reduceToolbarScroll(state, offsetY);
}

describe('reduceToolbarScroll', () => {
  it('starts visible at the top', () => {
    expect(createToolbarScrollState()).toEqual({ offsetY: 0, upwardTravel: 0, visible: true });
  });

  it('hides as soon as the form scrolls down', () => {
    const hidden = scroll(createToolbarScrollState(), 24);
    expect(hidden.visible).toBe(false);
    expect(hidden.upwardTravel).toBe(0);
  });

  it('stays hidden until the upward move reaches the reveal distance', () => {
    const hidden = scroll(createToolbarScrollState(), 80);
    const almost = scroll(hidden, 80 - (TOOLBAR_REVEAL_DISTANCE - 1));
    expect(almost.visible).toBe(false);
    expect(almost.upwardTravel).toBe(TOOLBAR_REVEAL_DISTANCE - 1);

    const shown = scroll(almost, almost.offsetY - 1);
    expect(shown.visible).toBe(true);
    expect(shown.upwardTravel).toBe(0);
  });

  it('stays visible while scrolling further up', () => {
    const hidden = scroll(createToolbarScrollState(), 80);
    const shown = scroll(hidden, 80 - TOOLBAR_REVEAL_DISTANCE);
    const higher = scroll(shown, 20);
    expect(higher.visible).toBe(true);
  });

  it('hides again on the next downward move and forgets the earlier upward travel', () => {
    const hidden = scroll(createToolbarScrollState(), 80);
    const climbing = scroll(hidden, 76);
    expect(climbing.upwardTravel).toBe(4);

    const downAgain = scroll(climbing, 90);
    expect(downAgain).toMatchObject({ visible: false, upwardTravel: 0, offsetY: 90 });
  });

  it('shows the toolbar when the scroll position returns to the top', () => {
    const hidden = scroll(createToolbarScrollState(), 8);
    expect(scroll(hidden, 0).visible).toBe(true);
  });

  it('ignores sub-pixel jitter so a resting finger does not hide the toolbar', () => {
    const resting = createToolbarScrollState();
    expect(scroll(resting, 0.2)).toBe(resting);
  });
});
