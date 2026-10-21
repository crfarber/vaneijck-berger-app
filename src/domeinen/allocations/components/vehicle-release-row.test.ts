import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./vehicle-release-row.tsx', import.meta.url), 'utf8');

describe('VehicleReleaseRow source', () => {
  it('opens the release form route with locationId and serviceId', () => {
    expect(source).toContain(
      "pathname: '/vehicle-releases/[locationId]/services/[serviceId]/form'",
    );
    expect(source).toContain('params: { locationId, serviceId }');
  });

  it('does not navigate when serviceId or locationId is missing', () => {
    expect(source).toContain('if (!serviceId || !locationId)');
    expect(source).toContain('disabled={!serviceId || !locationId}');
  });
});
