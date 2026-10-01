import { describe, expect, it, vi } from 'vitest';
import { HttpError } from '@/shared/api/errors';
import type { HttpClient } from '@/shared/api/http-client';
import { createWorkerApi } from './worker-api';

function setup(response: unknown) {
  const requestJson = vi.fn(
    async (_path: string, schema: { parse(value: unknown): unknown }, _options?: unknown) =>
      schema.parse(response),
  );
  const request = vi.fn(async () => undefined);
  const http = { request, requestJson } as unknown as HttpClient;
  return { api: createWorkerApi(http), requestJson, request };
}

describe('get', () => {
  it('returns the parsed worker, with the forward flag normalised from a CRM 1 to a real boolean', async () => {
    const { api, requestJson } = setup({
      dn_workerid: 'w1',
      dn_name: 'Jan',
      dn_canforwardallocationcode: 1,
      dn_availabilitystatuscode: 875920000,
    });

    expect(await api.get()).toEqual({
      dn_workerid: 'w1',
      dn_name: 'Jan',
      dn_canforwardallocationcode: true,
      dn_availabilitystatuscode: 875920000,
    });
    expect(requestJson.mock.calls[0]?.[0]).toBe('/api/workers');
  });

  it('normalises a CRM 0 to false', async () => {
    const { api } = setup({ dn_workerid: 'w1', dn_canforwardallocationcode: 0 });
    expect((await api.get())?.dn_canforwardallocationcode).toBe(false);
  });

  it('reads a literal boolean true through unchanged', async () => {
    const { api } = setup({ dn_workerid: 'w1', dn_canforwardallocationcode: true });
    expect((await api.get())?.dn_canforwardallocationcode).toBe(true);
  });

  it('defaults a missing availability status to null', async () => {
    const { api } = setup({ dn_workerid: 'w1', dn_canforwardallocationcode: false });
    expect((await api.get())?.dn_availabilitystatuscode).toBeNull();
  });

  it('returns null when there is no worker record yet (404)', async () => {
    const requestJson = vi.fn(async () => {
      throw new HttpError(404, null, '');
    });
    const http = { request: vi.fn(), requestJson } as unknown as HttpClient;

    expect(await createWorkerApi(http).get()).toBeNull();
  });

  it('returns null when the backend answers 2xx with an empty body', async () => {
    const { api } = setup(undefined);
    expect(await api.get()).toBeNull();
  });

  it('lets any other error through', async () => {
    const requestJson = vi.fn(async () => {
      throw new HttpError(500, null, '');
    });
    const http = { request: vi.fn(), requestJson } as unknown as HttpClient;

    await expect(createWorkerApi(http).get()).rejects.toThrow(HttpError);
  });
});

describe('setAvailability', () => {
  it('PUTs the status code as the JSON body', async () => {
    const { api, request } = setup({ dn_workerid: 'w1' });

    await api.setAvailability(875920003);

    expect(request).toHaveBeenCalledWith('/api/workers/availability', {
      method: 'PUT',
      json: 875920003,
      responseType: 'none',
    });
  });
});
