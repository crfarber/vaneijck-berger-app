import type { ReregisterOutcome } from '@/domeinen/allocation-unit';
import type { UserType } from '@/domeinen/auth';

/**
 * Where the signed-in user goes next. Both registration steps pick from the same reference-data
 * fleet or type a plate; only the QR-scan shortcut into the internal one is missing (camera
 * permission, not yet built — see roadmap slice 8/10).
 */
export type OnboardingStep =
  | 'allocations'
  | 'register-external-unit'
  | 'register-internal-unit'
  /** Unit exists with a vehicle; only the shift end time needs refreshing (old SetWorkingHours). */
  | 'extend-shift';

/** Shown once when the berger may finish open work without a valid unit first. */
export type OnboardingNotice = 'none' | 'no-valid-unit-continue';

export type OnboardingDecision = {
  step: OnboardingStep;
  notice: OnboardingNotice;
};

/**
 * Combines the unit check with whether the backend already reported open work (ACTIVE_INCIDENT).
 * That flag keeps the berger on the assignments list after a failed registration instead of
 * looping back to the form.
 */
export function decideOnboarding(input: {
  reregister: ReregisterOutcome;
  userType: UserType;
  backendReportedOpenWork: boolean;
}): OnboardingDecision {
  const { reregister, userType, backendReportedOpenWork } = input;

  if (reregister.kind === 'blocked') {
    return { step: 'allocations', notice: 'no-valid-unit-continue' };
  }

  if (reregister.kind === 'not-needed') {
    return {
      step: 'allocations',
      notice: reregister.expiredWithActiveWork === true ? 'no-valid-unit-continue' : 'none',
    };
  }

  // required — unless the backend already confirmed open work (escape hatch from a failing form).
  if (backendReportedOpenWork) {
    return { step: 'allocations', notice: 'no-valid-unit-continue' };
  }

  if (reregister.reason === 'expired') {
    return { step: 'extend-shift', notice: 'none' };
  }

  return {
    step: userType === 'external' ? 'register-external-unit' : 'register-internal-unit',
    notice: 'none',
  };
}
