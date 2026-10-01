import type { HttpClient } from '@/shared/api/http-client';

/** Posts the device token. The generated client of the old app sends `{ notificationtoken }` and reads no body. */
export type PushRegistrationApi = {
  register(token: string): Promise<void>;
};

export function createPushRegistrationApi(http: HttpClient): PushRegistrationApi {
  return {
    async register(token) {
      await http.request('/api/workers/register', {
        method: 'POST',
        json: { notificationtoken: token },
        responseType: 'none',
      });
    },
  };
}
