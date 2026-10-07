import { SERVICE_STATUS } from '@/domeinen/services';
import { PHOTO_PHASE, type PhotoPhase } from './types';

/**
 * Maps a CRM service status to the photo phase, using the definition's phase count.
 * Delivery photos only exist when the definition has a later phase and the load is accepted.
 * A one-phase definition (Afgifte) stays on load photos even at HULPVERLENING_AKKOORD.
 *
 * Without `phaseNumbers`, falls back to the old two-phase assumption so callers that have not
 * loaded a definition yet still get a phase.
 */
export function photoPhaseFromServiceStatus(
  statuscode: number,
  phaseNumbers: readonly number[] = [1, 2],
): PhotoPhase {
  if (statuscode === SERVICE_STATUS.HULPVERLENING_AKKOORD && phaseNumbers.length > 1) {
    return PHOTO_PHASE.delivery;
  }
  return PHOTO_PHASE.load;
}

/**
 * Comment field on the upload. The old app used the status label (`Aanvang` / `Aflevering`).
 * Assumption: those two strings are enough; see open question in docs.
 */
export function commentForPhase(phase: PhotoPhase): string {
  return phase === PHOTO_PHASE.delivery ? 'Aflevering' : 'Aanvang';
}
