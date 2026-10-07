import { SERVICE_STATUS } from '@/domeinen/services';
import type { ServiceFormLanguageCode } from './types';

/**
 * Which phase of the `dataDefinition` a service is in. The definition's phase list is the source
 * of truth: one-phase services (Afgifte) stay on their only phase even after HULPVERLENING_AKKOORD;
 * two-phase services open the second phase once the load is accepted.
 */
export const SERVICE_FORM_PHASE = { load: 1, delivery: 2 } as const;

export type ServiceFormPhase = (typeof SERVICE_FORM_PHASE)[keyof typeof SERVICE_FORM_PHASE];

/** Sorted phase numbers from a raw `dataDefinition` phase list. */
export function phaseNumbersFromDefinition(
  phases: readonly { readonly phase?: number }[] | undefined,
): number[] {
  return (phases ?? [])
    .map((entry) => entry.phase)
    .filter((phase): phase is number => typeof phase === 'number')
    .slice()
    .sort((left, right) => left - right);
}

/**
 * Active form phase for the current CRM status, using the definition's phase numbers.
 * Without a second phase, HULPVERLENING_AKKOORD does not open a delivery form.
 */
export function serviceFormPhaseForStatus(
  statuscode: number | undefined,
  phaseNumbers: readonly number[],
): number {
  const first = phaseNumbers[0] ?? SERVICE_FORM_PHASE.load;
  const second = phaseNumbers[1];
  if (statuscode === SERVICE_STATUS.HULPVERLENING_AKKOORD && second !== undefined) {
    return second;
  }
  return first;
}

/** Whether submitting this phase completes the service according to the definition. */
export function isLastServiceFormPhase(phase: number, phaseNumbers: readonly number[]): boolean {
  if (phaseNumbers.length === 0) {
    return true;
  }
  return phase === phaseNumbers[phaseNumbers.length - 1];
}

/** The `language-code` of the labels in the schema: Dutch 1043, English 1044. */
export function serviceFormLanguageCode(language: string): ServiceFormLanguageCode {
  return language === 'en' ? 1044 : 1043;
}
