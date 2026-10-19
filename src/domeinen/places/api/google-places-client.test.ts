import { describe, expect, it, vi } from 'vitest';
import { createGooglePlacesClient } from './google-places-client';

describe('createGooglePlacesClient', () => {
  it('returns predictions for autocomplete', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      return Response.json({
        status: 'OK',
        predictions: [{ description: 'Teststraat 1, Utrecht', place_id: 'p1' }],
      });
    });
    const client = createGooglePlacesClient({ apiKey: 'key', fetch: fetchImpl });

    expect(await client.autocomplete('Test')).toEqual([
      { description: 'Teststraat 1, Utrecht', placeId: 'p1' },
    ]);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(String(fetchImpl.mock.lastCall?.[0])).toContain('autocomplete/json');
    expect(String(fetchImpl.mock.lastCall?.[0])).toContain('key=key');
  });

  it('returns empty predictions for short input', async () => {
    const fetchImpl = vi.fn();
    const client = createGooglePlacesClient({ apiKey: 'key', fetch: fetchImpl });
    expect(await client.autocomplete('a')).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('returns place details including coordinates when geometry is present', async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      void input;
      return Response.json({
        status: 'OK',
        result: {
          name: 'Van Eijck',
          formatted_address: 'Teststraat 1',
          address_components: [{ types: ['route'], long_name: 'Teststraat' }],
          geometry: { location: { lat: 52.1, lng: 5.1 } },
        },
      });
    });
    const client = createGooglePlacesClient({ apiKey: 'key', fetch: fetchImpl });
    expect(await client.details('p1')).toEqual({
      name: 'Van Eijck',
      formattedAddress: 'Teststraat 1',
      addressComponents: [{ types: ['route'], long_name: 'Teststraat' }],
      coordinate: { latitude: 52.1, longitude: 5.1 },
    });
    expect(String(fetchImpl.mock.lastCall?.[0])).toContain('geometry');
  });
});
