import { describe, expect, it } from 'vitest';
import { hasShiftEnded } from './shift';

const now = Date.parse('2026-10-19T12:00:00.000Z');

describe('hasShiftEnded', () => {
  it('uses validUntil when present', () => {
    expect(
      hasShiftEnded({
        validUntilIso: '2026-10-19T11:00:00.000Z',
        rememberedEndDateIso: '2026-10-19T18:00:00.000Z',
        nowMs: now,
      }),
    ).toBe(true);
    expect(
      hasShiftEnded({
        validUntilIso: '2026-10-19T18:00:00.000Z',
        rememberedEndDateIso: null,
        nowMs: now,
      }),
    ).toBe(false);
  });

  it('falls back to the remembered end date', () => {
    expect(
      hasShiftEnded({
        validUntilIso: null,
        rememberedEndDateIso: '2026-10-19T11:59:00.000Z',
        nowMs: now,
      }),
    ).toBe(true);
  });

  it('treats a missing deadline as ended', () => {
    expect(hasShiftEnded({ validUntilIso: null, rememberedEndDateIso: null, nowMs: now })).toBe(
      true,
    );
  });
});
