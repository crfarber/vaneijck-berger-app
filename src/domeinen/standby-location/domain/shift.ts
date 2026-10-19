/**
 * Whether the work shift has ended at `nowMs`. Prefers the unit's `validUntil`; falls back to a
 * remembered end date (ISO). Missing or unparsable dates count as ended (same spirit as
 * "never-set validUntil" in reregister).
 */
export function hasShiftEnded(input: {
  readonly validUntilIso: string | null | undefined;
  readonly rememberedEndDateIso: string | null | undefined;
  readonly nowMs: number;
}): boolean {
  const deadline = parseDeadline(input.validUntilIso) ?? parseDeadline(input.rememberedEndDateIso);
  if (deadline === null) {
    return true;
  }
  return deadline <= input.nowMs;
}

function parseDeadline(value: string | null | undefined): number | null {
  if (value === null || value === undefined || value.trim() === '') {
    return null;
  }
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}
