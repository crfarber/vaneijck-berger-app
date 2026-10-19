import type { StandbyLocationAdviceFields } from './types';

/** Short address for the banner: `street houseNo, city`. Falls back to name or empty. */
export function formatStandbyAddressShort(
  advice: Pick<StandbyLocationAdviceFields, 'street' | 'houseNo' | 'city' | 'name'>,
): string {
  const streetPart = [advice.street, advice.houseNo].filter(Boolean).join(' ').trim();
  const withCity =
    streetPart.length > 0 && advice.city !== undefined && advice.city.trim() !== ''
      ? `${streetPart}, ${advice.city.trim()}`
      : streetPart;

  if (withCity.length > 0) {
    return withCity;
  }
  if (advice.name !== undefined && advice.name.trim() !== '') {
    return advice.name.trim();
  }
  return '';
}
