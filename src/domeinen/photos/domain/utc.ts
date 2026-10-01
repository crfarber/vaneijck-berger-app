/**
 * Formats an epoch from the `Clock` as the UTC string the upload expects (`CreatedDateTime`).
 * Builds from the injected milliseconds — never from the wall clock.
 */
export function utcStringFromEpoch(epochMs: number): string {
  return new Date(epochMs).toUTCString();
}
