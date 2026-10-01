import { HttpError } from '@/shared/api/errors';
import type { HttpClient } from '@/shared/api/http-client';
import type { Worker } from '../domain/types';
import { currentWorkerSchema } from './schemas';

export type WorkerApi = {
  /** The signed-in berger's own worker record, or null when there is none (404, or an empty
   * 2xx body — the same shape of "nothing yet" as the allocation unit). */
  get(): Promise<Worker | null>;
  /** Sets availability (`PUT /api/workers/availability`). Body is the CRM status code; 204 on
   * success. Failures surface as exceptions — the UI keeps the previous pill (FS-015). */
  setAvailability(statuscode: number): Promise<void>;
};

export function createWorkerApi(http: HttpClient): WorkerApi {
  return {
    async get() {
      try {
        const worker = await http.requestJson('/api/workers', currentWorkerSchema);
        return worker ?? null;
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
          return null;
        }
        throw error;
      }
    },

    async setAvailability(statuscode) {
      await http.request('/api/workers/availability', {
        method: 'PUT',
        json: statuscode,
        responseType: 'none',
      });
    },
  };
}
