import { describe, expect, it } from 'vitest';
import { decideOnboarding } from './next-step';

describe('decideOnboarding', () => {
  it('ignores an outdated registration requirement while active work exists', () => {
    expect(
      decideOnboarding({
        reregister: { kind: 'required', reason: 'no-unit' },
        userType: 'external',
        backendReportedOpenWork: false,
        hasActiveWork: true,
      }),
    ).toEqual({ step: 'allocations', notice: 'no-valid-unit-continue' });
  });

  it('goes straight to the assignments list when the unit is fine', () => {
    expect(
      decideOnboarding({
        reregister: { kind: 'not-needed' },
        userType: 'external',
        backendReportedOpenWork: false,
      }),
    ).toEqual({ step: 'allocations', notice: 'none' });
    expect(
      decideOnboarding({
        reregister: { kind: 'not-needed' },
        userType: 'internal',
        backendReportedOpenWork: false,
      }),
    ).toEqual({ step: 'allocations', notice: 'none' });
  });

  it('keeps an external worker on the assignments list when no unit exists', () => {
    expect(
      decideOnboarding({
        reregister: { kind: 'required', reason: 'no-unit' },
        userType: 'external',
        backendReportedOpenWork: false,
      }),
    ).toEqual({ step: 'allocations', notice: 'register-unit' });
  });

  it('sends an internal worker to register their unit when the vehicle is missing', () => {
    expect(
      decideOnboarding({
        reregister: { kind: 'required', reason: 'no-vehicle' },
        userType: 'internal',
        backendReportedOpenWork: false,
      }),
    ).toEqual({ step: 'register-internal-unit', notice: 'none' });
  });

  it('only asks for a new end time when the unit still exists but the shift expired', () => {
    expect(
      decideOnboarding({
        reregister: { kind: 'required', reason: 'expired' },
        userType: 'external',
        backendReportedOpenWork: false,
      }),
    ).toEqual({ step: 'extend-shift', notice: 'none' });
    expect(
      decideOnboarding({
        reregister: { kind: 'required', reason: 'expired' },
        userType: 'internal',
        backendReportedOpenWork: false,
      }),
    ).toEqual({ step: 'extend-shift', notice: 'none' });
  });

  it('lets a blocked berger continue to the list with a notice', () => {
    expect(
      decideOnboarding({
        reregister: { kind: 'blocked', reason: 'no-unit' },
        userType: 'external',
        backendReportedOpenWork: false,
      }),
    ).toEqual({ step: 'allocations', notice: 'no-valid-unit-continue' });
  });

  it('skips the notice when the shift expired amid active work', () => {
    expect(
      decideOnboarding({
        reregister: { kind: 'not-needed', expiredWithActiveWork: true },
        userType: 'external',
        backendReportedOpenWork: false,
      }),
    ).toEqual({ step: 'allocations', notice: 'none' });
  });

  it('escapes a required registration when the backend reported open work (ACTIVE_INCIDENT)', () => {
    expect(
      decideOnboarding({
        reregister: { kind: 'required', reason: 'no-unit' },
        userType: 'external',
        backendReportedOpenWork: true,
      }),
    ).toEqual({ step: 'allocations', notice: 'no-valid-unit-continue' });
  });
});
