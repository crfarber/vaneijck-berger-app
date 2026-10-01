import { getServicePhase } from '@/domeinen/services';
import { PHOTO_PHASE, type PhotoPhase } from './types';

/**
 * Maps a CRM service status to the photo phase. Accept and unknown statuses fall back to load —
 * the berger can still take photos before the first submit.
 */
export function photoPhaseFromServiceStatus(statuscode: number): PhotoPhase {
  const phase = getServicePhase(statuscode);
  return phase === 'delivery' ? PHOTO_PHASE.delivery : PHOTO_PHASE.load;
}

/**
 * Comment field on the upload. The old app used the status label (`Aanvang` / `Aflevering`).
 * Assumption: those two strings are enough; see open question in docs.
 */
export function commentForPhase(phase: PhotoPhase): string {
  return phase === PHOTO_PHASE.delivery ? 'Aflevering' : 'Aanvang';
}
