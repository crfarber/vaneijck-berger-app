import { z } from 'zod';
import type { StructuredAddress } from '@/domeinen/places';
import type { PostalAddressLookupInput } from './types';

const legacyPostalAddressSchema = z.looseObject({
  results: z
    .array(
      z.looseObject({
        city: z.string().trim().min(1),
        street: z.string().trim().min(1),
      }),
    )
    .min(1),
});

const POSTAL_CODE_PATTERN = /^(\d{4})\s*([A-Z]{2})$/i;
const FORMATTED_LOCALITY_PATTERN = /^(\d{4})\s*([A-Z]{2})\s+(.+)$/i;

export function normalizeDutchPostalCode(value: string): string | null {
  const match = POSTAL_CODE_PATTERN.exec(value.trim());
  if (!match?.[1] || !match[2]) {
    return null;
  }
  return `${match[1]} ${match[2].toUpperCase()}`;
}

export function isPostalAddressLookupReady(postalCode: string, houseNumber: string): boolean {
  return normalizeDutchPostalCode(postalCode) !== null && /^\d+$/.test(houseNumber.trim());
}

const buildAddress = (
  street: string,
  city: string,
  input: PostalAddressLookupInput,
  formatted?: string,
): StructuredAddress | null => {
  const postalCode = normalizeDutchPostalCode(input.postalCode);
  const houseNumber = input.houseNumber.trim();
  const houseNumberAddition = input.houseNumberAddition.trim();
  if (!postalCode || !houseNumber || !street.trim() || !city.trim()) {
    return null;
  }
  const streetLine = `${street.trim()} ${houseNumber}${houseNumberAddition}`;
  return {
    name: '',
    formatted: formatted ?? `${streetLine}, ${postalCode} ${city.trim()}`,
    street: street.trim(),
    houseNumber,
    houseNumberAddition,
    postalCode,
    city: city.trim(),
    province: '',
    countryIso2: 'NL',
  };
};

const parseLegacyResponse = (
  response: string,
  input: PostalAddressLookupInput,
): StructuredAddress | null => {
  try {
    const parsed = legacyPostalAddressSchema.safeParse(JSON.parse(response));
    const result = parsed.success ? parsed.data.results[0] : undefined;
    return result ? buildAddress(result.street, result.city, input) : null;
  } catch {
    return null;
  }
};

const parseFormattedResponse = (
  response: string,
  input: PostalAddressLookupInput,
): StructuredAddress | null => {
  const separatorIndex = response.indexOf(',');
  if (separatorIndex < 0) {
    return null;
  }
  const streetLine = response.slice(0, separatorIndex).trim();
  const localityLine = response.slice(separatorIndex + 1).trim();
  const localityMatch = FORMATTED_LOCALITY_PATTERN.exec(localityLine);
  const responsePostalCode = localityMatch
    ? normalizeDutchPostalCode(`${localityMatch[1]} ${localityMatch[2]}`)
    : null;
  const inputPostalCode = normalizeDutchPostalCode(input.postalCode);
  const city = localityMatch?.[3]?.trim();
  if (!responsePostalCode || responsePostalCode !== inputPostalCode || !city) {
    return null;
  }

  const requestedSuffix = `${input.houseNumber.trim()}${input.houseNumberAddition.trim()}`;
  if (!requestedSuffix || !streetLine.endsWith(requestedSuffix)) {
    return null;
  }
  const street = streetLine.slice(0, -requestedSuffix.length).trim();
  return buildAddress(street, city, input, response.trim());
};

export function parsePostalAddressLookupResponse(
  response: string,
  input: PostalAddressLookupInput,
): StructuredAddress | null {
  const trimmed = response.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.startsWith('{')
    ? parseLegacyResponse(trimmed, input)
    : parseFormattedResponse(trimmed, input);
}
