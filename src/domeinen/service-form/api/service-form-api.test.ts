import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@/shared/api/http-client';
import { createServiceFormApi } from './service-form-api';

describe('updateService', () => {
  it('puts the form body on the service', async () => {
    const request = vi.fn(async () => undefined);
    const api = createServiceFormApi({ request } as unknown as HttpClient);

    await api.updateService('svc 1', { statuscode: 875920004, dn_remarks: 'ok' });

    expect(request).toHaveBeenCalledWith('/api/services/svc%201', {
      method: 'PUT',
      json: { statuscode: 875920004, dn_remarks: 'ok' },
      responseType: 'none',
    });
  });
});
