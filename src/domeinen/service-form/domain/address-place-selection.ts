/**
 * Maps a structured Places result onto CRM address fields. Ported from the pilot's
 * `addressPlaceSelection.ts` — pure, no network. Parsing of Google components lives in
 * `@/domeinen/places` (`toStructuredAddress`).
 */

import type { StructuredAddress } from '@/domeinen/places';
import type { ServiceFormAnswer, ServiceFormAnswers } from './types';

export type AddressComponentMapping = {
  name?: string;
  country?: string;
  postalcode?: string;
  houseno?: string;
  housenoadd?: string;
  street?: string;
  city?: string;
  province?: string;
};

export type CountryLookupRow = {
  dn_iso2code?: string;
  dn_countryid?: string;
  dn_name?: string;
};

const textAnswer = (text: string): ServiceFormAnswer => ({
  value: text,
  displayValue: text,
});

export function resolveCountryAnswer(
  iso2Code: string | undefined,
  countryRows: readonly CountryLookupRow[] | null | undefined,
): ServiceFormAnswer | null {
  if (!iso2Code || !countryRows?.length) {
    return null;
  }
  const match = countryRows.find(
    (row) => row.dn_iso2code?.toUpperCase() === iso2Code.toUpperCase(),
  );
  if (!match?.dn_countryid) {
    return null;
  }
  return {
    value: match.dn_countryid,
    displayValue: match.dn_name ?? iso2Code,
    table: 'dn_country',
  };
}

/** Appends the country name to a formatted address when it is not already present. */
export function withCountryInAddressSummary(
  formatted: string,
  countryDisplay: string | undefined,
): string {
  const country = countryDisplay?.trim();
  if (!country) {
    return formatted;
  }
  if (formatted.toLowerCase().includes(country.toLowerCase())) {
    return formatted;
  }
  return `${formatted}, ${country}`;
}

/**
 * Maps a structured Places address to CRM field answers, mirroring
 * `ProcessingService.handleAddressPlaceSelect`.
 */
export function buildAddressPlaceAnswers(
  fieldKey: string,
  address: StructuredAddress,
  components: AddressComponentMapping,
  countryRows: readonly CountryLookupRow[] | null | undefined,
): ServiceFormAnswers {
  const updates: ServiceFormAnswers = {};

  updates[fieldKey] = textAnswer(address.formatted);

  if (components.name) {
    updates[components.name] = textAnswer(address.name);
  }

  if (components.postalcode) {
    updates[components.postalcode] = textAnswer(address.postalCode);
  }

  const countryAnswer = resolveCountryAnswer(address.countryIso2 || undefined, countryRows);
  if (components.country && countryAnswer) {
    updates[components.country] = countryAnswer;
  }

  if (components.houseno) {
    updates[components.houseno] = textAnswer(address.houseNumber);
  }
  if (components.housenoadd) {
    updates[components.housenoadd] = textAnswer(address.houseNumberAddition);
  }

  if (components.street) {
    updates[components.street] = textAnswer(address.street);
  }

  if (components.city) {
    updates[components.city] = textAnswer(address.city);
  }

  if (components.province) {
    updates[components.province] = textAnswer(address.province);
  }

  return updates;
}

export function readAddressComponentMapping(
  raw: Record<string, unknown>,
): AddressComponentMapping | null {
  const mapping = raw.address_components;
  if (!mapping || typeof mapping !== 'object') {
    return null;
  }
  return mapping as AddressComponentMapping;
}
