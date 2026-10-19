import type { PlacesClient, StructuredAddress } from '@/domeinen/places';
import { isPostalAddressLookupReady, type PostalAddressLookupInput } from '@/domeinen/service-form';
import type { FakeStandbyAddress } from './fake-standby-notification';

export type ResolveStandbyAddressDeps = {
  lookupPostalAddress: (input: PostalAddressLookupInput) => Promise<StructuredAddress | null>;
  places: PlacesClient | null;
};

export type ResolveStandbyAddressResult =
  | { ok: true; address: FakeStandbyAddress }
  | {
      ok: false;
      reason: 'invalid-input' | 'address-not-found' | 'places-unavailable' | 'no-coordinates';
    };

/**
 * Resolves a Dutch postcode + house number to street/city (CRM zipcode check) and GPS
 * (Google Places details geometry) for a debug standby advice.
 */
export async function resolveStandbyAddressFromPostal(
  input: Pick<PostalAddressLookupInput, 'postalCode' | 'houseNumber'>,
  deps: ResolveStandbyAddressDeps,
): Promise<ResolveStandbyAddressResult> {
  const postalCode = input.postalCode.trim();
  const houseNumber = input.houseNumber.trim();
  if (!isPostalAddressLookupReady(postalCode, houseNumber)) {
    return { ok: false, reason: 'invalid-input' };
  }
  if (deps.places === null) {
    return { ok: false, reason: 'places-unavailable' };
  }

  const lookupInput: PostalAddressLookupInput = {
    postalCode,
    houseNumber,
    houseNumberAddition: '',
  };
  const structured = await deps.lookupPostalAddress(lookupInput);
  if (structured === null) {
    return { ok: false, reason: 'address-not-found' };
  }

  const query = `${structured.street} ${structured.houseNumber}, ${structured.postalCode} ${structured.city}`;
  const predictions = await deps.places.autocomplete(query);
  const first = predictions[0];
  if (first === undefined) {
    return { ok: false, reason: 'no-coordinates' };
  }
  const details = await deps.places.details(first.placeId);
  if (details?.coordinate === undefined) {
    return { ok: false, reason: 'no-coordinates' };
  }

  return {
    ok: true,
    address: {
      standbyLocationId: `debug-postal-${structured.postalCode.replace(/\s+/g, '')}-${houseNumber}`,
      name: structured.city,
      street: structured.street,
      houseNo: structured.houseNumber,
      city: structured.city,
      postalCode: structured.postalCode.replace(/\s+/g, ''),
      latitude: details.coordinate.latitude,
      longitude: details.coordinate.longitude,
    },
  };
}
