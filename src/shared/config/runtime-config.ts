import { z } from 'zod';
import { err, ok, type Result } from '@/shared/result';

export const ENVIRONMENTS = ['internal', 'acceptance', 'production'] as const;
export type Environment = (typeof ENVIRONMENTS)[number];

export type AzureAdConfig = {
  tenantId: string;
  clientId: string;
  redirectUrl: string;
};

export type RuntimeConfig = {
  apiBaseUrl: string;
  environment: Environment;
  /** Null when Azure AD is not configured (internal login unavailable). */
  azureAd: AzureAdConfig | null;
  /** OAuth client_id for external (SMS) users. Public identifier, not a secret. */
  externalClientId: string;
  googlePlacesApiKey: string | null;
};

/** Names of the variables the app reads. Expo inlines EXPO_PUBLIC_* at build time. */
export type RawEnv = Partial<
  Record<
    | 'EXPO_PUBLIC_API_BASE_URL'
    | 'EXPO_PUBLIC_ENVIRONMENT'
    | 'EXPO_PUBLIC_AZURE_AD_TENANT_ID'
    | 'EXPO_PUBLIC_AZURE_AD_CLIENT_ID'
    | 'EXPO_PUBLIC_AZURE_AD_REDIRECT_URL'
    | 'EXPO_PUBLIC_EXTERNAL_CLIENT_ID'
    | 'EXPO_PUBLIC_GOOGLE_PLACES_API_KEY',
    string | undefined
  >
>;

const optionalString = z.string().min(1).optional();

const envSchema = z.object({
  EXPO_PUBLIC_API_BASE_URL: z.url().transform((value) => value.replace(/\/+$/, '')),
  EXPO_PUBLIC_ENVIRONMENT: z.enum(ENVIRONMENTS).default('internal'),
  EXPO_PUBLIC_AZURE_AD_TENANT_ID: optionalString,
  EXPO_PUBLIC_AZURE_AD_CLIENT_ID: optionalString,
  EXPO_PUBLIC_AZURE_AD_REDIRECT_URL: optionalString,
  EXPO_PUBLIC_EXTERNAL_CLIENT_ID: z.string().min(1),
  EXPO_PUBLIC_GOOGLE_PLACES_API_KEY: optionalString,
});

/** `.env` files produce empty strings for unset variables; treat them as missing. */
function withoutEmptyValues(env: RawEnv): Record<string, string | undefined> {
  return Object.fromEntries(
    Object.entries(env).map(([key, value]) => [key, value === '' ? undefined : value]),
  );
}

/** Validates the environment once at startup. Fails fast with readable messages. */
export function parseRuntimeConfig(env: RawEnv): Result<RuntimeConfig, string[]> {
  const parsed = envSchema.safeParse(withoutEmptyValues(env));
  if (!parsed.success) {
    return err(parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`));
  }

  const data = parsed.data;
  const azureFields = {
    tenantId: data.EXPO_PUBLIC_AZURE_AD_TENANT_ID,
    clientId: data.EXPO_PUBLIC_AZURE_AD_CLIENT_ID,
    redirectUrl: data.EXPO_PUBLIC_AZURE_AD_REDIRECT_URL,
  };
  const azureValues = Object.values(azureFields);
  const azureConfigured = azureValues.filter((value) => value !== undefined).length;

  if (azureConfigured > 0 && azureConfigured < azureValues.length) {
    return err([
      'EXPO_PUBLIC_AZURE_AD_*: set tenant id, client id and redirect url together, or none of them',
    ]);
  }

  const { tenantId, clientId, redirectUrl } = azureFields;

  return ok({
    apiBaseUrl: data.EXPO_PUBLIC_API_BASE_URL,
    environment: data.EXPO_PUBLIC_ENVIRONMENT,
    azureAd:
      tenantId !== undefined && clientId !== undefined && redirectUrl !== undefined
        ? { tenantId, clientId, redirectUrl }
        : null,
    externalClientId: data.EXPO_PUBLIC_EXTERNAL_CLIENT_ID,
    googlePlacesApiKey: data.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY ?? null,
  });
}
