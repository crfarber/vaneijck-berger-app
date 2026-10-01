import { SERVICE_STATUS } from '@/domeinen/services';
import type { ServiceFormLanguageCode } from './types';

/**
 * Which phase of the `dataDefinition` a service is in. The pilot and the old app both pick the
 * delivery phase once the load is accepted (HULPVERLENING_AKKOORD), and the load phase otherwise.
 */
export const SERVICE_FORM_PHASE = { load: 1, delivery: 2 } as const;

export type ServiceFormPhase = (typeof SERVICE_FORM_PHASE)[keyof typeof SERVICE_FORM_PHASE];

export function serviceFormPhaseForStatus(statuscode: number | undefined): ServiceFormPhase {
  return statuscode === SERVICE_STATUS.HULPVERLENING_AKKOORD
    ? SERVICE_FORM_PHASE.delivery
    : SERVICE_FORM_PHASE.load;
}

/** The `language-code` of the labels in the schema: Dutch 1043, English 1044. */
export function serviceFormLanguageCode(language: string): ServiceFormLanguageCode {
  return language === 'en' ? 1044 : 1043;
}
