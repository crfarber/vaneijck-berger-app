/**
 * Country dial codes the berger can prefix a phone number with. Same set as the old CountryPicker
 * (European operating area). Netherlands is first because that is the default.
 */
export const LOGIN_COUNTRIES = [
  { id: 'NL', dialCode: '+31', flag: '🇳🇱' },
  { id: 'BE', dialCode: '+32', flag: '🇧🇪' },
  { id: 'DE', dialCode: '+49', flag: '🇩🇪' },
  { id: 'AT', dialCode: '+43', flag: '🇦🇹' },
  { id: 'BG', dialCode: '+359', flag: '🇧🇬' },
  { id: 'HR', dialCode: '+385', flag: '🇭🇷' },
  { id: 'CY', dialCode: '+357', flag: '🇨🇾' },
  { id: 'CZ', dialCode: '+420', flag: '🇨🇿' },
  { id: 'DK', dialCode: '+45', flag: '🇩🇰' },
  { id: 'EE', dialCode: '+372', flag: '🇪🇪' },
  { id: 'FI', dialCode: '+358', flag: '🇫🇮' },
  { id: 'FR', dialCode: '+33', flag: '🇫🇷' },
  { id: 'GI', dialCode: '+350', flag: '🇬🇮' },
  { id: 'GR', dialCode: '+30', flag: '🇬🇷' },
  { id: 'HU', dialCode: '+36', flag: '🇭🇺' },
  { id: 'IS', dialCode: '+354', flag: '🇮🇸' },
  { id: 'IE', dialCode: '+353', flag: '🇮🇪' },
  { id: 'IT', dialCode: '+39', flag: '🇮🇹' },
  { id: 'LV', dialCode: '+371', flag: '🇱🇻' },
  { id: 'LI', dialCode: '+423', flag: '🇱🇮' },
  { id: 'LT', dialCode: '+370', flag: '🇱🇹' },
  { id: 'LU', dialCode: '+352', flag: '🇱🇺' },
  { id: 'MT', dialCode: '+356', flag: '🇲🇹' },
  { id: 'NO', dialCode: '+47', flag: '🇳🇴' },
  { id: 'PL', dialCode: '+48', flag: '🇵🇱' },
  { id: 'PT', dialCode: '+351', flag: '🇵🇹' },
  { id: 'RO', dialCode: '+40', flag: '🇷🇴' },
  { id: 'SK', dialCode: '+421', flag: '🇸🇰' },
  { id: 'SI', dialCode: '+386', flag: '🇸🇮' },
  { id: 'ES', dialCode: '+34', flag: '🇪🇸' },
  { id: 'SE', dialCode: '+46', flag: '🇸🇪' },
] as const;

export type LoginCountry = (typeof LOGIN_COUNTRIES)[number];
export type CountryId = LoginCountry['id'];

export const DEFAULT_COUNTRY_CODE = '+31';

/** Longest prefix first, so +351 is Portugal and not the Netherlands. */
const COUNTRIES_BY_LONGEST_PREFIX: readonly LoginCountry[] = [...LOGIN_COUNTRIES].sort(
  (left, right) => right.dialCode.length - left.dialCode.length,
);

export function countryForDialCode(dialCode: string): LoginCountry | undefined {
  const trimmed = dialCode.trim();
  return LOGIN_COUNTRIES.find((country) => country.dialCode === trimmed);
}

/**
 * Best matching country for a string of digits that already had `+` or `00` stripped.
 * `31612345678` is the Netherlands with national number `612345678`.
 */
export function matchDialPrefix(digits: string): { country: LoginCountry; rest: string } | null {
  if (digits === '') {
    return null;
  }
  for (const country of COUNTRIES_BY_LONGEST_PREFIX) {
    const prefix = country.dialCode.slice(1);
    if (digits.startsWith(prefix)) {
      return { country, rest: digits.slice(prefix.length) };
    }
  }
  return null;
}
