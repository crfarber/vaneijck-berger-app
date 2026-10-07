import { describe, expect, it } from 'vitest';
import { resolveProcessingExit, type ProcessingExitInput } from './processing-exit';
import { SERVICE_TYPE } from './service-types';
import { SERVICE_STATUS } from './status';

function submit(overrides: Partial<Extract<ProcessingExitInput, { trigger: 'submit' }>> = {}) {
  return resolveProcessingExit({
    trigger: 'submit',
    currentStatuscode: SERVICE_STATUS.IN_UITVOERING,
    postedBody: {},
    ...overrides,
  });
}

describe('blocked triggers', () => {
  it.each(['blocked', 'serviceGone'] as const)('%s returns to the allocation', (trigger) => {
    expect(resolveProcessingExit({ trigger })).toEqual({
      exitKind: 'blocked',
      isEarlyComplete: false,
      isLcmh: false,
    });
  });
});

describe('finish trigger', () => {
  it('is terminal', () => {
    expect(resolveProcessingExit({ trigger: 'finish' }).exitKind).toBe('terminal');
  });
});

describe('decline trigger', () => {
  it('ends the service for a futile trip', () => {
    const exit = resolveProcessingExit({
      trigger: 'decline',
      declineStatusCode: SERVICE_STATUS.VERGEEFSE_RIT,
    });
    expect(exit.exitKind).toBe('terminal');
  });

  it('keeps the incident open for any other decline', () => {
    const exit = resolveProcessingExit({
      trigger: 'decline',
      declineStatusCode: SERVICE_STATUS.AFMELDING_GEWEIGERD,
    });
    expect(exit.exitKind).toBe('continueIncident');
  });
});

describe('submit trigger', () => {
  it('is blocked when the current status does not allow a submit', () => {
    expect(submit({ currentStatuscode: SERVICE_STATUS.GEFACTUREERD }).exitKind).toBe('blocked');
    expect(submit({ currentStatuscode: 999 }).exitKind).toBe('blocked');
  });

  it('continues the incident after an intermediate phase', () => {
    expect(
      submit({ postedBody: { statuscode: SERVICE_STATUS.HULPVERLENING_AKKOORD } }).exitKind,
    ).toBe('continueIncident');
  });

  it('goes to the closing screen after the last phase of a multi-phase service', () => {
    const exit = submit({
      currentStatuscode: SERVICE_STATUS.HULPVERLENING_AKKOORD,
      postedBody: { statuscode: SERVICE_STATUS.HULPVERLENING_AFGEROND },
    });
    expect(exit.exitKind).toBe('processingFinish');
  });

  it('ends a one-phase submit that posts afgerond from an earlier status', () => {
    const exit = submit({
      currentStatuscode: SERVICE_STATUS.IN_UITVOERING,
      postedBody: { statuscode: SERVICE_STATUS.HULPVERLENING_AFGEROND },
    });
    expect(exit).toEqual({ exitKind: 'terminal', isEarlyComplete: false, isLcmh: false });
  });

  it('ends the service when a rule says it completes early', () => {
    const exit = submit({
      serviceTypeCode: SERVICE_TYPE.ASSISTANCE,
      postedBody: { dn_assisistancetypeofbreakdowncode: 1001 },
    });
    expect(exit).toEqual({ exitKind: 'terminal', isEarlyComplete: true, isLcmh: false });
  });

  it('prefers early completion over the closing screen', () => {
    const exit = submit({
      currentStatuscode: SERVICE_STATUS.HULPVERLENING_AKKOORD,
      serviceTypeCode: SERVICE_TYPE.BERGING,
      postedBody: { dn_ekv: true, statuscode: SERVICE_STATUS.HULPVERLENING_AFGEROND },
    });
    expect(exit.exitKind).toBe('terminal');
    expect(exit.isEarlyComplete).toBe(true);
  });

  it('ends a submit that posts the Nacontrole status', () => {
    const exit = submit({ postedBody: { statuscode: SERVICE_STATUS.NACONTROLE } });
    expect(exit.exitKind).toBe('terminal');
  });

  it('ignores a posted status that is not a number', () => {
    const exit = submit({ postedBody: { statuscode: String(SERVICE_STATUS.NACONTROLE) } });
    expect(exit.exitKind).toBe('continueIncident');
  });

  it('ends a release item that has a location', () => {
    expect(submit({ isReleaseItem: true, locationId: 'loc-1' }).exitKind).toBe('terminal');
  });

  it('continues for a release item without a location', () => {
    expect(submit({ isReleaseItem: true }).exitKind).toBe('continueIncident');
    expect(submit({ isReleaseItem: false, locationId: 'loc-1' }).exitKind).toBe('continueIncident');
  });

  it.each([1002, 1005])('flags LCMH for im action status %i', (code) => {
    const exit = submit({
      postedBody: { statuscode: SERVICE_STATUS.HULPVERLENING_AKKOORD, dn_imactionstatuscode: code },
    });
    expect(exit).toEqual({ exitKind: 'continueIncident', isEarlyComplete: false, isLcmh: true });
  });

  it('does not flag LCMH for other or non-numeric codes', () => {
    expect(submit({ postedBody: { dn_imactionstatuscode: 1003 } }).isLcmh).toBe(false);
    expect(submit({ postedBody: { dn_imactionstatuscode: '1005' } }).isLcmh).toBe(false);
  });

  it('keeps the LCMH flag when the service ends', () => {
    const exit = submit({
      postedBody: {
        statuscode: SERVICE_STATUS.HULPVERLENING_AFGEROND,
        dn_imactionstatuscode: 1005,
      },
    });
    expect(exit).toEqual({ exitKind: 'terminal', isEarlyComplete: false, isLcmh: true });
  });

  it('does not check the status when it is unknown to the caller', () => {
    expect(resolveProcessingExit({ trigger: 'submit', postedBody: {} }).exitKind).toBe(
      'continueIncident',
    );
  });
});
