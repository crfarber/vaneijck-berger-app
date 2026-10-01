import { describe, expect, it } from 'vitest';
import { parseRuntimeConfig, type RawEnv } from './runtime-config';

const minimal: RawEnv = {
  EXPO_PUBLIC_API_BASE_URL: 'https://api.test',
  EXPO_PUBLIC_EXTERNAL_CLIENT_ID: 'external-client',
};

const azure: RawEnv = {
  EXPO_PUBLIC_AZURE_AD_TENANT_ID: 'tenant',
  EXPO_PUBLIC_AZURE_AD_CLIENT_ID: 'client',
  EXPO_PUBLIC_AZURE_AD_REDIRECT_URL: 'com.vrscloud://auth',
};

describe('parseRuntimeConfig', () => {
  it('accepts a minimal environment and applies defaults', () => {
    const result = parseRuntimeConfig(minimal);

    expect(result).toEqual({
      ok: true,
      value: {
        apiBaseUrl: 'https://api.test',
        environment: 'internal',
        azureAd: null,
        externalClientId: 'external-client',
        googlePlacesApiKey: null,
      },
    });
  });

  it('strips trailing slashes from the base url', () => {
    const result = parseRuntimeConfig({
      ...minimal,
      EXPO_PUBLIC_API_BASE_URL: 'https://api.test//',
    });
    expect(result.ok && result.value.apiBaseUrl).toBe('https://api.test');
  });

  it('requires the api base url', () => {
    const result = parseRuntimeConfig({});
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error[0]).toContain('EXPO_PUBLIC_API_BASE_URL');
  });

  it('rejects an invalid api base url', () => {
    expect(parseRuntimeConfig({ EXPO_PUBLIC_API_BASE_URL: 'not a url' }).ok).toBe(false);
  });

  it('treats empty strings as missing', () => {
    const result = parseRuntimeConfig({
      ...minimal,
      EXPO_PUBLIC_ENVIRONMENT: '',
      EXPO_PUBLIC_GOOGLE_PLACES_API_KEY: '',
      EXPO_PUBLIC_AZURE_AD_TENANT_ID: '',
    });
    expect(result.ok && result.value.environment).toBe('internal');
    expect(result.ok && result.value.googlePlacesApiKey).toBeNull();
    expect(result.ok && result.value.azureAd).toBeNull();
  });

  it('requires the external OAuth client id', () => {
    const missing = parseRuntimeConfig({ EXPO_PUBLIC_API_BASE_URL: 'https://api.test' });
    expect(missing.ok).toBe(false);
    expect(!missing.ok && missing.error[0]).toContain('EXPO_PUBLIC_EXTERNAL_CLIENT_ID');

    const empty = parseRuntimeConfig({
      EXPO_PUBLIC_API_BASE_URL: 'https://api.test',
      EXPO_PUBLIC_EXTERNAL_CLIENT_ID: '',
    });
    expect(empty.ok).toBe(false);
  });

  it('accepts a known environment and rejects an unknown one', () => {
    const acceptance = parseRuntimeConfig({ ...minimal, EXPO_PUBLIC_ENVIRONMENT: 'acceptance' });
    expect(acceptance.ok && acceptance.value.environment).toBe('acceptance');

    expect(parseRuntimeConfig({ ...minimal, EXPO_PUBLIC_ENVIRONMENT: 'staging' }).ok).toBe(false);
  });

  it('builds the Azure AD config when all three fields are present', () => {
    const result = parseRuntimeConfig({ ...minimal, ...azure });
    expect(result.ok && result.value.azureAd).toEqual({
      tenantId: 'tenant',
      clientId: 'client',
      redirectUrl: 'com.vrscloud://auth',
    });
  });

  it('rejects a partial Azure AD config', () => {
    const result = parseRuntimeConfig({
      ...minimal,
      EXPO_PUBLIC_AZURE_AD_TENANT_ID: 'tenant',
    });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error[0]).toContain('AZURE_AD');
  });

  it('passes through the optional Google Places key', () => {
    const result = parseRuntimeConfig({
      ...minimal,
      EXPO_PUBLIC_GOOGLE_PLACES_API_KEY: 'places',
    });
    expect(result.ok && result.value.googlePlacesApiKey).toBe('places');
  });
});
