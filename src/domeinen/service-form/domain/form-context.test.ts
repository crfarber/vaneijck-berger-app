import { describe, expect, it } from 'vitest';
import { SERVICE_STATUS } from '@/domeinen/services';
import { serviceFormLanguageCode, serviceFormPhaseForStatus } from './form-context';

describe('serviceFormPhaseForStatus', () => {
  it('fills in the delivery phase once the load is accepted', () => {
    expect(serviceFormPhaseForStatus(SERVICE_STATUS.HULPVERLENING_AKKOORD)).toBe(2);
  });

  it('fills in the load phase for every other status', () => {
    expect(serviceFormPhaseForStatus(SERVICE_STATUS.IN_UITVOERING)).toBe(1);
    expect(serviceFormPhaseForStatus(undefined)).toBe(1);
  });
});

describe('serviceFormLanguageCode', () => {
  it('reads English labels for English and Dutch labels otherwise', () => {
    expect(serviceFormLanguageCode('en')).toBe(1044);
    expect(serviceFormLanguageCode('nl')).toBe(1043);
    expect(serviceFormLanguageCode('de')).toBe(1043);
  });
});
