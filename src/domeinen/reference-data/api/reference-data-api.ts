import type { HttpClient } from '@/shared/api/http-client';
import { entityDataSchema, schemaListSchema } from './schemas';

export type ReferenceDataApi = {
  /** Entity names changed since `since` (ISO date), or every entity when `since` is undefined. */
  fetchSchema(languageCode: number, since: string | undefined): Promise<string[]>;
  fetchEntity(name: string, languageCode: number): Promise<unknown[]>;
};

export type ReferenceDataApiDeps = {
  http: HttpClient;
};

export function createReferenceDataApi(deps: ReferenceDataApiDeps): ReferenceDataApi {
  const { http } = deps;

  return {
    fetchSchema(languageCode, since) {
      return http.requestJson(`/api/client-sync/schema/${languageCode}`, schemaListSchema, {
        headers: since !== undefined ? { SINCEDATE: since } : undefined,
      });
    },

    fetchEntity(name, languageCode) {
      return http.requestJson(
        `/api/client-sync/${encodeURIComponent(name)}/${languageCode}`,
        entityDataSchema,
      );
    },
  };
}
