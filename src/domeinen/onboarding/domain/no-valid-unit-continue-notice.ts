/**
 * The onboarding gate may remount (Strict Mode, leaving `/` and coming back with
 * `openWork=1`, query-key flicker). A `useRef` resets on remount and would show the
 * "geen geldige eenheid" alert twice; this module flag survives remounts for the JS session.
 *
 * Clear only when the gate is ready and no longer needs the notice — not while status is
 * `checking`, or a brief `notice: 'none'` flicker would re-arm the alert.
 */
let claimed = false;

/** Returns true the first time this notice may be shown; later calls return false until cleared. */
export function claimNoValidUnitContinueNotice(): boolean {
  if (claimed) {
    return false;
  }
  claimed = true;
  return true;
}

/** Allows the notice again after the berger no longer needs it (valid unit / signed out). */
export function clearNoValidUnitContinueNotice(): void {
  claimed = false;
}
