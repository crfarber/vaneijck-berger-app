import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const hook = readFileSync(new URL('./use-return-to-photo-overview.ts', import.meta.url), 'utf8');
const sentScreen = readFileSync(
  new URL('../screens/photo-sent-confirmation-screen.tsx', import.meta.url),
  'utf8',
);
const layout = readFileSync(
  new URL(
    '../../../app/(app)/allocations/[id]/services/[serviceId]/photos/_layout.tsx',
    import.meta.url,
  ),
  'utf8',
);

describe('returning to the photo overview', () => {
  it('pops the photo stack to its root overview instead of stacking a second overview', () => {
    expect(hook).toContain("navigation.dispatch({ type: 'POP_TO_TOP', target: state.key })");
    expect(hook).toContain("state.routes[0]?.name === 'index'");
    expect(hook).not.toContain('router.navigate(');
    expect(hook).not.toMatch(/if \(router\.canDismiss\(\)\)/);
  });

  it('is used by the sent confirmation instead of navigating to the overview', () => {
    expect(sentScreen).toContain('useReturnToPhotoOverview(routeParams)');
    expect(sentScreen).not.toContain('router.navigate(');
  });

  it('keeps the overview as the root of the photo stack', () => {
    expect(layout).toContain("unstable_settings = { initialRouteName: 'index' }");
  });
});
