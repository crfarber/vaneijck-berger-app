/** Parse `1,2` route params into phase numbers from the service definition. */
export function parsePhaseNumbersParam(value: string | undefined): number[] | undefined {
  if (value === undefined || value.trim() === '') {
    return undefined;
  }
  const numbers = value
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((phase) => Number.isFinite(phase));
  return numbers.length > 0 ? numbers : undefined;
}
