import { matchDialPrefix } from './country-codes';

export { DEFAULT_COUNTRY_CODE } from './country-codes';

/** Fewer digits than this cannot be a phone number. */
const MIN_NATIONAL_DIGITS = 5;

/**
 * Turns what the user typed and the chosen country code into an international number.
 * Spaces, hyphens and brackets are removed and ONE leading zero (the national trunk prefix) is
 * dropped: `06 12345678` with `+31` becomes `+31612345678`.
 *
 * The old app dropped the first character of any input of 10 or more characters, whatever it
 * was, and kept the zero of shorter input.
 */
export function normalizePhoneNumber(countryCode: string, input: string): string {
  const digits = input.replace(/\D/g, '');
  const national = digits.startsWith('0') ? digits.slice(1) : digits;
  return `${countryCode.trim()}${national}`;
}

/** Whether the typed number is plausible enough to send an SMS to (E.164: at most 15 digits). */
export function isPlausiblePhoneNumber(countryCode: string, input: string): boolean {
  const nationalDigits = input.replace(/\D/g, '').replace(/^0/, '');
  if (nationalDigits.length < MIN_NATIONAL_DIGITS) {
    return false;
  }
  return /^\+[1-9]\d{6,14}$/.test(normalizePhoneNumber(countryCode, input));
}

/** Dutch and Belgian numbers switch the app to Dutch; every other country code to English. */
export function languageForCountryCode(countryCode: string): 'nl' | 'en' {
  return countryCode === '+31' || countryCode === '+32' ? 'nl' : 'en';
}

/**
 * Splits what the user typed into a country prefix and a national number.
 * An international number (`+31…` or `00 31…`) selects that country even if another prefix was
 * chosen. A number that already starts with a known dial code (e.g. `31612345678`) is split the
 * same way, so the prefix is not applied twice.
 */
export function applyPhoneInput(
  selectedDialCode: string,
  input: string,
): { countryCode: string; nationalNumber: string } {
  const compact = input.trim().replace(/[\s().-]/g, '');
  let digits: string;
  let explicitInternational = false;

  if (compact.startsWith('+')) {
    explicitInternational = true;
    digits = compact.slice(1).replace(/\D/g, '');
  } else if (compact.startsWith('00')) {
    explicitInternational = true;
    digits = compact.slice(2).replace(/\D/g, '');
  } else {
    digits = compact.replace(/\D/g, '');
  }

  const matched = matchDialPrefix(digits);
  if (matched !== null && (explicitInternational || matched.rest.length >= MIN_NATIONAL_DIGITS)) {
    return { countryCode: matched.country.dialCode, nationalNumber: matched.rest };
  }

  return { countryCode: selectedDialCode, nationalNumber: input };
}
