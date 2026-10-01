import { parseRuntimeConfig, type RuntimeConfig } from '@/shared/config/runtime-config';

/**
 * Reads the build-time configuration. Expo replaces `process.env.EXPO_PUBLIC_*` while bundling,
 * but ONLY for these literal references; a dynamic `process.env[name]` would stay empty. That is
 * why every variable is spelled out here.
 */
export function readRuntimeConfig(): RuntimeConfig {
  const result = parseRuntimeConfig({
    EXPO_PUBLIC_API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL,
    EXPO_PUBLIC_ENVIRONMENT: process.env.EXPO_PUBLIC_ENVIRONMENT,
    EXPO_PUBLIC_AZURE_AD_TENANT_ID: process.env.EXPO_PUBLIC_AZURE_AD_TENANT_ID,
    EXPO_PUBLIC_AZURE_AD_CLIENT_ID: process.env.EXPO_PUBLIC_AZURE_AD_CLIENT_ID,
    EXPO_PUBLIC_AZURE_AD_REDIRECT_URL: process.env.EXPO_PUBLIC_AZURE_AD_REDIRECT_URL,
    EXPO_PUBLIC_EXTERNAL_CLIENT_ID: process.env.EXPO_PUBLIC_EXTERNAL_CLIENT_ID,
    EXPO_PUBLIC_GOOGLE_PLACES_API_KEY: process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY,
  });

  if (!result.ok) {
    throw new Error(
      `Invalid app configuration. Check your .env.local (see .env.example):\n- ${result.error.join('\n- ')}`,
    );
  }
  return result.value;
}
