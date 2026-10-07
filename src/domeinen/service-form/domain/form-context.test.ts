import { describe, expect, it } from 'vitest';
import { SERVICE_STATUS } from '@/domeinen/services';
import {
  isLastServiceFormPhase,
  phaseNumbersFromDefinition,
  serviceFormLanguageCode,
  serviceFormPhaseForStatus,
} from './form-context';

describe('phaseNumbersFromDefinition', () => {
  it('returns sorted phase numbers from the definition', () => {
    expect(phaseNumbersFromDefinition([{ phase: 2 }, { phase: 1 }])).toEqual([1, 2]);
  });

  it('skips entries without a phase number', () => {
    expect(phaseNumbersFromDefinition([{ phase: 1 }, {}, { phase: 3 }])).toEqual([1, 3]);
  });

  it('returns an empty list when the definition has no phases', () => {
    expect(phaseNumbersFromDefinition(undefined)).toEqual([]);
    expect(phaseNumbersFromDefinition([])).toEqual([]);
  });
});

describe('serviceFormPhaseForStatus', () => {
  it('opens the second phase once the load is accepted when the definition has two phases', () => {
    expect(serviceFormPhaseForStatus(SERVICE_STATUS.HULPVERLENING_AKKOORD, [1, 2])).toBe(2);
  });

  it('stays on the only phase when the definition has one phase', () => {
    expect(serviceFormPhaseForStatus(SERVICE_STATUS.HULPVERLENING_AKKOORD, [1])).toBe(1);
    expect(serviceFormPhaseForStatus(SERVICE_STATUS.IN_UITVOERING, [1])).toBe(1);
  });

  it('uses the first phase for every other status', () => {
    expect(serviceFormPhaseForStatus(SERVICE_STATUS.IN_UITVOERING, [1, 2])).toBe(1);
    expect(serviceFormPhaseForStatus(undefined, [1, 2])).toBe(1);
  });

  it('falls back to phase 1 when the definition has no phases', () => {
    expect(serviceFormPhaseForStatus(SERVICE_STATUS.HULPVERLENING_AKKOORD, [])).toBe(1);
  });
});

describe('isLastServiceFormPhase', () => {
  it('treats the only phase as last', () => {
    expect(isLastServiceFormPhase(1, [1])).toBe(true);
  });

  it('treats phase 1 as intermediate when a second phase exists', () => {
    expect(isLastServiceFormPhase(1, [1, 2])).toBe(false);
    expect(isLastServiceFormPhase(2, [1, 2])).toBe(true);
  });

  it('treats any phase as last when the definition lists none', () => {
    expect(isLastServiceFormPhase(1, [])).toBe(true);
  });
});

describe('serviceFormLanguageCode', () => {
  it('reads English labels for English and Dutch labels otherwise', () => {
    expect(serviceFormLanguageCode('en')).toBe(1044);
    expect(serviceFormLanguageCode('nl')).toBe(1043);
    expect(serviceFormLanguageCode('de')).toBe(1043);
  });
});
