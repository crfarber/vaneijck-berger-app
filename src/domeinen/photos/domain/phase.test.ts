import { describe, expect, it } from 'vitest';
import { SERVICE_STATUS } from '@/domeinen/services';
import { commentForPhase, photoPhaseFromServiceStatus } from './phase';

describe('photoPhaseFromServiceStatus', () => {
  it('maps delivery status to delivery when the definition has two phases', () => {
    expect(photoPhaseFromServiceStatus(SERVICE_STATUS.HULPVERLENING_AKKOORD, [1, 2])).toBe(
      'delivery',
    );
    expect(photoPhaseFromServiceStatus(SERVICE_STATUS.IN_UITVOERING, [1, 2])).toBe('load');
  });

  it('stays on load photos for a one-phase definition even after akkoord', () => {
    expect(photoPhaseFromServiceStatus(SERVICE_STATUS.HULPVERLENING_AKKOORD, [1])).toBe('load');
    expect(photoPhaseFromServiceStatus(SERVICE_STATUS.IN_UITVOERING, [1])).toBe('load');
  });

  it('falls back to the two-phase assumption when no definition phases are given', () => {
    expect(photoPhaseFromServiceStatus(SERVICE_STATUS.HULPVERLENING_AKKOORD)).toBe('delivery');
    expect(photoPhaseFromServiceStatus(SERVICE_STATUS.WACHT_OP_ACCEPTATIE_TP)).toBe('load');
    expect(photoPhaseFromServiceStatus(SERVICE_STATUS.LAATSTE_BERICHT)).toBe('load');
    expect(photoPhaseFromServiceStatus(999)).toBe('load');
  });
});

describe('commentForPhase', () => {
  it('uses the old status labels', () => {
    expect(commentForPhase('load')).toBe('Aanvang');
    expect(commentForPhase('delivery')).toBe('Aflevering');
  });
});
