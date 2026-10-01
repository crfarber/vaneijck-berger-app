import type { Language } from '@/shared/i18n/resources';

/**
 * Microsoft LCIDs the `client-sync` endpoints take. The old app always sent 1043 (nl-NL), even for
 * an English UI. 1033 (en-US) made several entity fetches return HTTP 500 on tst (open question 6),
 * so this app sends 1043 for every language until the backend confirms an English code.
 */
const LANGUAGE_CODES: Record<Language, number> = {
  nl: 1043,
  en: 1043,
};

export function languageCodeFor(language: Language): number {
  return LANGUAGE_CODES[language];
}
