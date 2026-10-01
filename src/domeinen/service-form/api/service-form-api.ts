import type { HttpClient } from '@/shared/api/http-client';

export type ServiceFormApi = {
  /**
   * Sends the filled-in form (`buildServicePostBody`). PUT like the pilot's generated client; the
   * old swagger documents a POST merge on the same path (docs/functioneel/open-vragen.md, vraag 26).
   */
  updateService(serviceId: string, body: Record<string, unknown>): Promise<void>;
};

export function createServiceFormApi(http: HttpClient): ServiceFormApi {
  return {
    async updateService(serviceId, body) {
      await http.request(`/api/services/${encodeURIComponent(serviceId)}`, {
        method: 'PUT',
        json: body,
        responseType: 'none',
      });
    },
  };
}
