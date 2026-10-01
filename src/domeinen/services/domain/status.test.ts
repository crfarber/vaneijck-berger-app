import { describe, expect, it } from 'vitest';
import {
  getServiceBucket,
  getServicePhase,
  getServiceStatusName,
  hasActiveServices,
  hasOpenServices,
  isServiceOpenForWork,
  isSubmitAllowed,
  SERVICE_STATUS,
} from './status';

describe('SERVICE_STATUS', () => {
  it('has a unique code per status (the old app had two statuses on 875920018)', () => {
    const codes = Object.values(SERVICE_STATUS);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

describe('getServiceStatusName', () => {
  it('maps a code back to its name', () => {
    expect(getServiceStatusName(875920004)).toBe('HULPVERLENING_AKKOORD');
    expect(getServiceStatusName(1)).toBe('WACHT_OP_ACCEPTATIE_TP');
  });

  it('returns UNKNOWN for unknown or missing codes', () => {
    expect(getServiceStatusName(999)).toBe('UNKNOWN');
    expect(getServiceStatusName(undefined)).toBe('UNKNOWN');
  });
});

describe('isSubmitAllowed', () => {
  it.each([
    'NOG_AANSTUREN',
    'WACHT_OP_ACCEPTATIE_TP',
    'IN_UITVOERING',
    'HULPVERLENING_AKKOORD',
    'HULPVERLENING_AFGEROND',
    'LAATSTE_BERICHT',
  ] as const)('allows %s', (name) => {
    expect(isSubmitAllowed(SERVICE_STATUS[name])).toBe(true);
  });

  it.each([
    'VERGEEFSE_RIT',
    'NACONTROLE',
    'AFMELDING_GEWEIGERD',
    'OPSLAG',
    'WACHT_OP_ORDERNUMMER',
    'DOORBROEP_CONTROLE',
    'GECONTROLEERD',
    'NOG_ONDERWEG',
    'FACTUREERBAAR',
    'GEFACTUREERD',
    'FACTUUR_OP_VERVOLGDIENST',
    'DUPLICAATMELDING',
    'COULANCE',
    'GECORRIGEERD_OP_ANDERE_DIENST',
  ] as const)('rejects %s', (name) => {
    expect(isSubmitAllowed(SERVICE_STATUS[name])).toBe(false);
  });

  it('rejects unknown and missing statuses', () => {
    expect(isSubmitAllowed(999)).toBe(false);
    expect(isSubmitAllowed(undefined)).toBe(false);
  });
});

describe('getServiceBucket', () => {
  it('puts working statuses in active', () => {
    expect(getServiceBucket(SERVICE_STATUS.IN_UITVOERING)).toBe('active');
    expect(getServiceBucket(SERVICE_STATUS.HULPVERLENING_AKKOORD)).toBe('active');
    expect(getServiceBucket(875920001)).toBe('active');
  });

  it('puts finished help in completed', () => {
    expect(getServiceBucket(SERVICE_STATUS.HULPVERLENING_AFGEROND)).toBe('completed');
  });

  it('puts everything else, including unknown codes, in pending', () => {
    expect(getServiceBucket(SERVICE_STATUS.NOG_AANSTUREN)).toBe('pending');
    expect(getServiceBucket(SERVICE_STATUS.WACHT_OP_ACCEPTATIE_TP)).toBe('pending');
    expect(getServiceBucket(SERVICE_STATUS.LAATSTE_BERICHT)).toBe('pending');
    expect(getServiceBucket(123456)).toBe('pending');
  });
});

describe('isServiceOpenForWork', () => {
  it.each([
    'NOG_AANSTUREN',
    'WACHT_OP_ACCEPTATIE_TP',
    'IN_UITVOERING',
    'HULPVERLENING_AKKOORD',
  ] as const)('is open for %s', (name) => {
    expect(isServiceOpenForWork(SERVICE_STATUS[name])).toBe(true);
  });

  it.each([
    'HULPVERLENING_AFGEROND',
    'LAATSTE_BERICHT',
    'VERGEEFSE_RIT',
    'NACONTROLE',
    'GEFACTUREERD',
  ] as const)('is closed for %s', (name) => {
    expect(isServiceOpenForWork(SERVICE_STATUS[name])).toBe(false);
  });

  it('is closed without a status', () => {
    expect(isServiceOpenForWork(undefined)).toBe(false);
  });

  it('keeps a service with an unknown status open, so it is never hidden from the berger', () => {
    expect(isServiceOpenForWork(999_999)).toBe(true);
    expect(isServiceOpenForWork(875920001)).toBe(true);
  });
});

describe('hasOpenServices', () => {
  it('is true when at least one service is open', () => {
    expect(
      hasOpenServices([
        { statuscode: SERVICE_STATUS.HULPVERLENING_AFGEROND },
        { statuscode: SERVICE_STATUS.IN_UITVOERING },
      ]),
    ).toBe(true);
  });

  it('is false when all services are closed', () => {
    expect(
      hasOpenServices([
        { statuscode: SERVICE_STATUS.HULPVERLENING_AFGEROND },
        { statuscode: SERVICE_STATUS.LAATSTE_BERICHT },
      ]),
    ).toBe(false);
  });

  it('is false for no services', () => {
    expect(hasOpenServices([])).toBe(false);
    expect(hasOpenServices(undefined)).toBe(false);
    expect(hasOpenServices(null)).toBe(false);
  });
});

describe('hasActiveServices', () => {
  it('is true when a service is actually being worked on', () => {
    expect(hasActiveServices([{ statuscode: SERVICE_STATUS.IN_UITVOERING }])).toBe(true);
  });

  it('is false when services are only pending, not active (narrower than hasOpenServices)', () => {
    const pendingOnly = [{ statuscode: SERVICE_STATUS.NOG_AANSTUREN }];
    expect(hasOpenServices(pendingOnly)).toBe(true);
    expect(hasActiveServices(pendingOnly)).toBe(false);
  });

  it('is false for no services', () => {
    expect(hasActiveServices([])).toBe(false);
    expect(hasActiveServices(undefined)).toBe(false);
    expect(hasActiveServices(null)).toBe(false);
  });
});

describe('getServicePhase', () => {
  it.each([
    [SERVICE_STATUS.WACHT_OP_ACCEPTATIE_TP, 'accept'],
    [SERVICE_STATUS.NOG_AANSTUREN, 'loading'],
    [SERVICE_STATUS.IN_UITVOERING, 'loading'],
    [SERVICE_STATUS.HULPVERLENING_AKKOORD, 'delivery'],
    [SERVICE_STATUS.LAATSTE_BERICHT, 'completed'],
    [SERVICE_STATUS.NACONTROLE, null],
    [999, null],
  ])('maps %i to %s', (statuscode, phase) => {
    expect(getServicePhase(statuscode)).toBe(phase);
  });
});
