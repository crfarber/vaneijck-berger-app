import { HttpError } from '@/shared/api/errors';
import type { HttpClient } from '@/shared/api/http-client';
import type { RdwInfo } from './schemas';
import { rdwInfoSchema } from './schemas';

export type RdwApi = {
  /**
   * Looks up a Dutch plate via the backend RDW proxy. Returns null when the plate is unknown
   * (404/400) or the body is empty — callers treat that as "fill manually". Other errors throw.
   */
  lookupByRegistrationNumber(registrationNumber: string): Promise<RdwInfo | null>;
};

export function createRdwApi(http: HttpClient): RdwApi {
  return {
    async lookupByRegistrationNumber(registrationNumber) {
      const plate = registrationNumber.trim();
      if (plate === '') {
        return null;
      }
      try {
        const info = await http.requestJson(
          `/api/check/rdw/registrationnumber/${encodeURIComponent(plate)}`,
          rdwInfoSchema,
        );
        return info ?? null;
      } catch (error) {
        if (error instanceof HttpError && (error.status === 404 || error.status === 400)) {
          return null;
        }
        throw error;
      }
    },
  };
}
