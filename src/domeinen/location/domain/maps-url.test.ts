import { describe, expect, it } from 'vitest';
import { googleMapsSearchUrl } from './maps-url';

describe('googleMapsSearchUrl', () => {
  it('builds the Google Maps search URL with latitude and longitude', () => {
    expect(googleMapsSearchUrl({ latitude: 52.370216, longitude: 4.895168 })).toBe(
      'https://www.google.com/maps/search/?api=1&query=52.370216,4.895168',
    );
  });
});
