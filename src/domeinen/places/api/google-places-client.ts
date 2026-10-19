import { z } from 'zod';

const predictionSchema = z.object({
  description: z.string(),
  place_id: z.string(),
});

const autocompleteResponseSchema = z.object({
  status: z.string(),
  predictions: z.array(predictionSchema).optional(),
  error_message: z.string().optional(),
});

const addressComponentSchema = z.object({
  types: z.array(z.string()),
  short_name: z.string().optional(),
  long_name: z.string().optional(),
});

const detailsResponseSchema = z.object({
  status: z.string(),
  result: z
    .object({
      name: z.string(),
      formatted_address: z.string().optional(),
      address_components: z.array(addressComponentSchema),
      geometry: z
        .object({
          location: z.object({
            lat: z.number(),
            lng: z.number(),
          }),
        })
        .optional(),
    })
    .optional(),
  error_message: z.string().optional(),
});

export type PlacePrediction = {
  description: string;
  placeId: string;
};

export type PlaceDetails = {
  name: string;
  formattedAddress?: string;
  addressComponents: Array<{
    types: string[];
    short_name?: string;
    long_name?: string;
  }>;
  /** Present when Place Details requested `geometry`. */
  coordinate?: { latitude: number; longitude: number };
};

export type PlacesClient = {
  autocomplete(input: string): Promise<PlacePrediction[]>;
  details(placeId: string): Promise<PlaceDetails | null>;
};

export type PlacesClientDeps = {
  apiKey: string;
  fetch: typeof fetch;
  /** Defaults to the classic Places HTTP API. */
  baseUrl?: string;
};

/**
 * Google Places HTTP client (classic Autocomplete + Details). Reusable outside the form —
 * no CRM auth, only the public API key from runtime config.
 */
export function createGooglePlacesClient(deps: PlacesClientDeps): PlacesClient {
  const baseUrl = deps.baseUrl ?? 'https://maps.googleapis.com/maps/api/place';

  async function getJson(path: string, query: Record<string, string>): Promise<unknown> {
    const url = new URL(`${baseUrl}${path}`);
    for (const [key, value] of Object.entries(query)) {
      url.searchParams.set(key, value);
    }
    url.searchParams.set('key', deps.apiKey);
    const response = await deps.fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Places HTTP ${response.status}`);
    }
    return response.json();
  }

  return {
    async autocomplete(input) {
      const trimmed = input.trim();
      if (trimmed.length < 2) {
        return [];
      }
      const raw = autocompleteResponseSchema.parse(
        await getJson('/autocomplete/json', { input: trimmed, language: 'nl' }),
      );
      if (raw.status !== 'OK' && raw.status !== 'ZERO_RESULTS') {
        throw new Error(raw.error_message ?? `Places autocomplete ${raw.status}`);
      }
      return (raw.predictions ?? []).map((prediction) => ({
        description: prediction.description,
        placeId: prediction.place_id,
      }));
    },

    async details(placeId) {
      const raw = detailsResponseSchema.parse(
        await getJson('/details/json', {
          place_id: placeId,
          fields: 'name,formatted_address,address_component,geometry',
          language: 'nl',
        }),
      );
      if (raw.status === 'ZERO_RESULTS' || !raw.result) {
        return null;
      }
      if (raw.status !== 'OK') {
        throw new Error(raw.error_message ?? `Places details ${raw.status}`);
      }
      const location = raw.result.geometry?.location;
      return {
        name: raw.result.name,
        formattedAddress: raw.result.formatted_address,
        addressComponents: raw.result.address_components,
        ...(location !== undefined
          ? { coordinate: { latitude: location.lat, longitude: location.lng } }
          : {}),
      };
    },
  };
}
