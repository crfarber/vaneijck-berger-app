/**
 * Local Dutch-oriented free-text name parser for person_group quick entry.
 * Pure: no React, no I/O. Salutation options are matched against caller-supplied selects.
 */

export type ParsedPersonName = {
  /** Matched salutation alias key when a known prefix was found. */
  readonly salutationKey: PersonSalutationKey | null;
  readonly initials: string | null;
  readonly firstName: string | null;
  readonly middleName: string | null;
  readonly lastName: string | null;
};

export const PERSON_SALUTATION_KEY = {
  deHeer: 'de_heer',
  mevrouw: 'mevrouw',
  doctor: 'doctor',
} as const;

export type PersonSalutationKey =
  (typeof PERSON_SALUTATION_KEY)[keyof typeof PERSON_SALUTATION_KEY];

export type PersonSalutationOption = {
  readonly label: string;
  readonly value: unknown;
};

type SalutationAliasGroup = {
  readonly key: PersonSalutationKey;
  /** Prefixes to strip from free text (longest first). */
  readonly aliases: readonly string[];
  /** Normalized substrings that identify a CRM option label. */
  readonly labelMatchers: readonly string[];
};

const SALUTATION_GROUPS: readonly SalutationAliasGroup[] = [
  {
    key: PERSON_SALUTATION_KEY.deHeer,
    aliases: ['de heer', 'dhr.', 'dhr'],
    labelMatchers: ['de heer', 'heer', 'dhr'],
  },
  {
    key: PERSON_SALUTATION_KEY.mevrouw,
    aliases: ['mevrouw', 'mevr.', 'mevr', 'mw.', 'mw'],
    labelMatchers: ['mevrouw', 'mevr', 'mw'],
  },
  {
    key: PERSON_SALUTATION_KEY.doctor,
    aliases: ['dokter', 'doctor', 'dr.', 'dr'],
    labelMatchers: ['dokter', 'doctor', 'dr'],
  },
];

/** Multi-word first, then single tokens. Not including generic EU particles (von, du, di). */
const NL_TUSSENVOEGSELS: readonly string[] = [
  'van der',
  'van den',
  'van de',
  "van 't",
  'van het',
  'in het',
  'in den',
  'op den',
  'op de',
  'aan de',
  'aan den',
  'van',
  'de',
  'den',
  'der',
  'ten',
  'ter',
  'te',
  "'t",
  'het',
  'op',
  'aan',
];

const normalizeSpaces = (value: string): string => value.trim().replace(/\s+/g, ' ');

const normalizeMatch = (value: string): string =>
  normalizeSpaces(value).toLowerCase().replace(/\./g, '').replace(/'/g, "'");

const isInitialsToken = (token: string): boolean => {
  const trimmed = token.trim();
  if (!trimmed) {
    return false;
  }
  // J. / A.B. / AB. / A.B
  return /^[A-Za-z](?:\.?[A-Za-z])*\.?$/.test(trimmed) && trimmed.includes('.');
};

const findSalutationPrefix = (
  normalizedLower: string,
): { key: PersonSalutationKey; aliasLength: number } | null => {
  let best: { key: PersonSalutationKey; aliasLength: number } | null = null;
  for (const group of SALUTATION_GROUPS) {
    for (const alias of group.aliases) {
      const aliasNorm = normalizeMatch(alias);
      if (
        normalizedLower === aliasNorm ||
        normalizedLower.startsWith(`${aliasNorm} `) ||
        normalizedLower.startsWith(`${aliasNorm},`)
      ) {
        const aliasLength = aliasNorm.length;
        if (!best || aliasLength > best.aliasLength) {
          best = { key: group.key, aliasLength };
        }
      }
    }
  }
  return best;
};

const stripPrefixByNormalizedLength = (original: string, normalizedAliasLength: number): string => {
  const lower = normalizeMatch(original);
  const restNormalized = lower.slice(normalizedAliasLength).replace(/^[\s,]+/, '');
  if (!restNormalized) {
    return '';
  }
  // Map back by walking original tokens roughly: drop leading tokens until remainder matches.
  const tokens = normalizeSpaces(original).split(' ');
  let consumed = '';
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (token === undefined) {
      break;
    }
    consumed = consumed ? `${consumed} ${token}` : token;
    if (normalizeMatch(consumed).length >= normalizedAliasLength) {
      return tokens.slice(i + 1).join(' ');
    }
  }
  return restNormalized;
};

const findTussenvoegsel = (
  tokens: readonly string[],
): { start: number; length: number; value: string } | null => {
  if (tokens.length < 2) {
    return null;
  }
  // Particle may start at 0 (e.g. "van den Berg" after initials). Leave ≥1 token for last name.
  for (let start = 0; start < tokens.length; start += 1) {
    const maxLen = tokens.length - start;
    for (const particle of NL_TUSSENVOEGSELS) {
      const parts = particle.split(' ');
      if (parts.length >= maxLen) {
        continue;
      }
      const slice = tokens.slice(start, start + parts.length);
      const candidate = slice.map((part) => part.toLowerCase().replace(/\./g, '')).join(' ');
      if (candidate === particle) {
        return { start, length: parts.length, value: slice.join(' ') };
      }
    }
  }
  return null;
};

/**
 * Parses a free-text Dutch-oriented person name into CRM-oriented parts.
 * Does not resolve salutation option ids; use {@link matchSalutationOption}.
 */
export function parsePersonName(input: string): ParsedPersonName {
  const empty: ParsedPersonName = {
    salutationKey: null,
    initials: null,
    firstName: null,
    middleName: null,
    lastName: null,
  };
  const trimmed = normalizeSpaces(input);
  if (!trimmed) {
    return empty;
  }

  const normalizedLower = normalizeMatch(trimmed);
  const salutation = findSalutationPrefix(normalizedLower);
  let remainder = trimmed;
  let salutationKey: PersonSalutationKey | null = null;
  if (salutation) {
    salutationKey = salutation.key;
    remainder = normalizeSpaces(stripPrefixByNormalizedLength(trimmed, salutation.aliasLength));
  }

  if (!remainder) {
    return { ...empty, salutationKey };
  }

  const tokens = remainder.split(' ');
  let initials: string | null = null;
  let nameTokens = tokens;

  if (tokens[0] && isInitialsToken(tokens[0])) {
    initials = tokens[0].endsWith('.') ? tokens[0] : `${tokens[0]}.`;
    nameTokens = tokens.slice(1);
  }

  if (nameTokens.length === 0) {
    return { salutationKey, initials, firstName: null, middleName: null, lastName: null };
  }

  if (nameTokens.length === 1) {
    return {
      salutationKey,
      initials,
      firstName: null,
      middleName: null,
      lastName: nameTokens[0] ?? null,
    };
  }

  const particle = findTussenvoegsel(nameTokens);
  if (particle) {
    const firstParts = nameTokens.slice(0, particle.start);
    const lastParts = nameTokens.slice(particle.start + particle.length);
    return {
      salutationKey,
      initials,
      firstName: firstParts.length > 0 ? firstParts.join(' ') : null,
      middleName: particle.value,
      lastName: lastParts.length > 0 ? lastParts.join(' ') : null,
    };
  }

  return {
    salutationKey,
    initials,
    firstName: nameTokens[0] ?? null,
    middleName: null,
    lastName: nameTokens.slice(1).join(' ') || null,
  };
}

/** Picks a select option for a parsed salutation key, or null when none matches. */
export function matchSalutationOption(
  salutationKey: PersonSalutationKey | null,
  options: readonly PersonSalutationOption[],
): PersonSalutationOption | null {
  if (!salutationKey || options.length === 0) {
    return null;
  }
  const group = SALUTATION_GROUPS.find((entry) => entry.key === salutationKey);
  if (!group) {
    return null;
  }
  for (const option of options) {
    const label = normalizeMatch(option.label);
    if (!label) {
      continue;
    }
    if (group.labelMatchers.some((matcher) => label === matcher || label.includes(matcher))) {
      return option;
    }
  }
  return null;
}

/** Human-readable preview for the confirm dialog. */
export function formatPersonNamePreview(
  parsed: ParsedPersonName,
  salutationLabel?: string | null,
): string {
  const parts = [
    salutationLabel?.trim() || null,
    parsed.initials,
    parsed.firstName,
    parsed.middleName,
    parsed.lastName,
  ].filter((part): part is string => Boolean(part && part.trim()));
  return parts.join(' · ');
}
