import { describe, expect, it, vi } from 'vitest';
import { HttpError } from '@/shared/api/errors';
import type { HttpClient } from '@/shared/api/http-client';
import { createSignaturesApi } from './signatures-api';

const input = {
  incidentId: 'inc-1',
  serviceId: 'svc-1',
  name: 'Jan',
  email: 'jan@example.com',
  phase: 'Aanvang',
  signatureType: 'Berger',
  fileBytes: new Uint8Array([0xff, 0xd8, 0xff]),
};

describe('createSignaturesApi', () => {
  it('posts multipart signature data', async () => {
    const request = vi.fn(async () => undefined);
    const http = { request, requestJson: vi.fn() } as unknown as HttpClient;
    await createSignaturesApi(http).upload(input);
    expect(request).toHaveBeenCalledWith(
      '/api/signatures',
      expect.objectContaining({
        method: 'POST',
        responseType: 'none',
        body: expect.any(FormData),
      }),
    );
  });

  it('treats HTTP 409 as success', async () => {
    const request = vi.fn(async () => {
      throw new HttpError(409, null, '');
    });
    const http = { request, requestJson: vi.fn() } as unknown as HttpClient;
    await expect(createSignaturesApi(http).upload(input)).resolves.toBeUndefined();
  });

  it('rethrows other HTTP errors', async () => {
    const request = vi.fn(async () => {
      throw new HttpError(500, null, '');
    });
    const http = { request, requestJson: vi.fn() } as unknown as HttpClient;
    await expect(createSignaturesApi(http).upload(input)).rejects.toBeInstanceOf(HttpError);
  });
});
