import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@/shared/api/http-client';
import { createPushRegistrationApi } from './push-registration-api';

describe('createPushRegistrationApi', () => {
  it('posts the token and ignores the response body', async () => {
    const request = vi.fn(async () => undefined);
    const http = { request, requestJson: vi.fn() } as unknown as HttpClient;
    const api = createPushRegistrationApi(http);

    await api.register('fcm-token-abc');

    expect(request).toHaveBeenCalledWith('/api/workers/register', {
      method: 'POST',
      json: { notificationtoken: 'fcm-token-abc' },
      responseType: 'none',
    });
  });
});
