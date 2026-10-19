import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Lives outside `src/app`: Expo Router would otherwise treat a colocated test as a route.
const layoutSource = readFileSync(
  new URL('../../../app/(app)/_layout.tsx', import.meta.url),
  'utf8',
);
const routeSource = readFileSync(
  new URL('../../../app/(app)/allocations/[id]/services/[serviceId].tsx', import.meta.url),
  'utf8',
);

describe('service finish route', () => {
  it('hides back navigation on the finish stack screen', () => {
    expect(layoutSource).toMatch(
      /name="allocations\/\[id\]\/services\/\[serviceId\]"[\s\S]*?headerBackVisible:\s*false/,
    );
    expect(layoutSource).toMatch(
      /name="allocations\/\[id\]\/services\/\[serviceId\]"[\s\S]*?gestureEnabled:\s*false/,
    );
    expect(layoutSource).toMatch(
      /name="allocations\/\[id\]\/services\/\[serviceId\]"[\s\S]*?headerLeft:\s*\(\)\s*=>\s*null/,
    );
  });

  it('mounts ServiceFinishScreen instead of the editable form', () => {
    expect(routeSource).toContain('ServiceFinishScreen');
    expect(routeSource).not.toContain('finishMode');
  });
});
