import { describe, expect, it, vi } from 'vitest';
import type { PlacesClient, StructuredAddress } from '@/domeinen/places';
import { resolveStandbyAddressFromPostal } from './resolve-standby-address';

const structured: StructuredAddress = {
  name: '',
  formatted: 'Diemerkade 12, 1111 AB DIEMEN',
  street: 'Diemerkade',
  houseNumber: '12',
  houseNumberAddition: '',
  postalCode: '1111 AB',
  city: 'DIEMEN',
  province: '',
  countryIso2: 'NL',
};

function placesStub(overrides: Partial<PlacesClient> = {}): PlacesClient {
  return {
    autocomplete: vi.fn(async () => [{ description: 'Diemerkade 12', placeId: 'p1' }]),
    details: vi.fn(async () => ({
      name: 'Diemerkade 12',
      addressComponents: [],
      coordinate: { latitude: 52.34, longitude: 4.95 },
    })),
    ...overrides,
  };
}

describe('resolveStandbyAddressFromPostal', () => {
  it('rejects invalid Dutch postcode or house number', async () => {
    const result = await resolveStandbyAddressFromPostal(
      { postalCode: '123', houseNumber: '12' },
      { lookupPostalAddress: vi.fn(), places: placesStub() },
    );
    expect(result).toEqual({ ok: false, reason: 'invalid-input' });
  });

  it('fails when Places is not configured', async () => {
    const result = await resolveStandbyAddressFromPostal(
      { postalCode: '1111AB', houseNumber: '12' },
      { lookupPostalAddress: vi.fn(), places: null },
    );
    expect(result).toEqual({ ok: false, reason: 'places-unavailable' });
  });

  it('fails when the CRM zipcode check finds nothing', async () => {
    const result = await resolveStandbyAddressFromPostal(
      { postalCode: '1111AB', houseNumber: '12' },
      {
        lookupPostalAddress: vi.fn(async () => null),
        places: placesStub(),
      },
    );
    expect(result).toEqual({ ok: false, reason: 'address-not-found' });
  });

  it('returns street, city and GPS from zipcode + Places geometry', async () => {
    const lookupPostalAddress = vi.fn(async () => structured);
    const places = placesStub();
    const result = await resolveStandbyAddressFromPostal(
      { postalCode: '1111 AB', houseNumber: '12' },
      { lookupPostalAddress, places },
    );
    expect(result).toEqual({
      ok: true,
      address: {
        standbyLocationId: 'debug-postal-1111AB-12',
        name: 'DIEMEN',
        street: 'Diemerkade',
        houseNo: '12',
        city: 'DIEMEN',
        postalCode: '1111AB',
        latitude: 52.34,
        longitude: 4.95,
      },
    });
    expect(places.autocomplete).toHaveBeenCalledWith('Diemerkade 12, 1111 AB DIEMEN');
  });

  it('fails when Places has no coordinates', async () => {
    const result = await resolveStandbyAddressFromPostal(
      { postalCode: '1111AB', houseNumber: '12' },
      {
        lookupPostalAddress: vi.fn(async () => structured),
        places: placesStub({
          details: vi.fn(async () => ({
            name: 'x',
            addressComponents: [],
          })),
        }),
      },
    );
    expect(result).toEqual({ ok: false, reason: 'no-coordinates' });
  });
});
