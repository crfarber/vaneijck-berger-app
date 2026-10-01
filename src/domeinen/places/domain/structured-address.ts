/**
 * Platform-neutral address parts from a Google Place. Callers (service-form, later other
 * screens) map this onto their own fields — Places never knows about CRM keys.
 */
export type StructuredAddress = {
  name: string;
  /** Prefer formatted address, then the prediction description, then the place name. */
  formatted: string;
  street: string;
  /** Digits from `street_number`. */
  houseNumber: string;
  /** Non-digit remainder of `street_number` (e.g. "A" from "1A"). */
  houseNumberAddition: string;
  postalCode: string;
  city: string;
  /** `administrative_area_level_1` when present. */
  province: string;
  /** ISO-3166 alpha-2 from the country component's short name. */
  countryIso2: string;
};

/** Shape accepted by {@link toStructuredAddress} (matches Place details from the API). */
export type PlaceAddressSource = {
  name: string;
  formattedAddress?: string;
  addressComponents: Array<{
    types: string[];
    short_name?: string;
    long_name?: string;
  }>;
};

function componentValue(details: PlaceAddressSource, type: string, preferShort: boolean): string {
  const found = details.addressComponents.find((element) => element.types.includes(type));
  if (!found) {
    return '';
  }
  if (preferShort) {
    return found.short_name ?? found.long_name ?? '';
  }
  return found.long_name ?? found.short_name ?? '';
}

/** Parse Place details (+ optional autocomplete description) into reusable parts. */
export function toStructuredAddress(
  details: PlaceAddressSource,
  predictionDescription?: string,
): StructuredAddress {
  const streetNumber = componentValue(details, 'street_number', false);
  return {
    name: details.name,
    formatted: details.formattedAddress || predictionDescription || details.name,
    street: componentValue(details, 'route', false),
    houseNumber: streetNumber.replace(/\D/g, ''),
    houseNumberAddition: streetNumber.replace(/[0-9]/g, ''),
    postalCode: componentValue(details, 'postal_code', false),
    city: componentValue(details, 'locality', false),
    province: componentValue(details, 'administrative_area_level_1', false),
    countryIso2: componentValue(details, 'country', true),
  };
}
