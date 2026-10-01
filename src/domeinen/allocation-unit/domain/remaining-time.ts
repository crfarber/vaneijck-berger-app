export function getRemainingMinutes(value: string | null, now: number): number | null {
  if (value === null) {
    return null;
  }

  const end = Date.parse(value);
  if (Number.isNaN(end)) {
    return null;
  }

  return Math.max(0, Math.ceil((end - now) / 60_000));
}
