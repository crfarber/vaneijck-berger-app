import { describe, expect, it, vi } from 'vitest';
import { HttpError } from '@/shared/api/errors';
import type { HttpClient } from '@/shared/api/http-client';
import { createRdwApi } from './rdw-api';

function setup(response: unknown) {
  const requestJson = vi.fn(async (_path: string, schema: { parse(value: unknown): unknown }) =>
    schema.parse(response),
  );
  const http = { request: vi.fn(), requestJson } as unknown as HttpClient;
  return { api: createRdwApi(http), requestJson };
}

describe('lookupByRegistrationNumber', () => {
  it('returns the parsed RDW info for a known plate', async () => {
    const { api, requestJson } = setup({
      licensePlate: 'AB123C',
      model: 'Nissan',
      tradeName: 'Juke',
      primaryColor: 'Zwart',
    });

    expect(await api.lookupByRegistrationNumber('AB-123-C')).toEqual({
      licensePlate: 'AB123C',
      model: 'Nissan',
      tradeName: 'Juke',
      primaryColor: 'Zwart',
    });
    expect(requestJson.mock.calls[0]?.[0]).toBe('/api/check/rdw/registrationnumber/AB-123-C');
  });

  it('returns null when the plate is blank', async () => {
    const { api, requestJson } = setup({});
    expect(await api.lookupByRegistrationNumber('  ')).toBeNull();
    expect(requestJson).not.toHaveBeenCalled();
  });

  it('returns null on 404 (unknown plate)', async () => {
    const requestJson = vi.fn(async () => {
      throw new HttpError(404, null, '');
    });
    const http = { request: vi.fn(), requestJson } as unknown as HttpClient;
    expect(await createRdwApi(http).lookupByRegistrationNumber('XX99XX')).toBeNull();
  });

  it('returns null on 400 (rejected plate)', async () => {
    const requestJson = vi.fn(async () => {
      throw new HttpError(400, null, '');
    });
    const http = { request: vi.fn(), requestJson } as unknown as HttpClient;
    expect(await createRdwApi(http).lookupByRegistrationNumber('BAD')).toBeNull();
  });

  it('rethrows unexpected HTTP errors', async () => {
    const requestJson = vi.fn(async () => {
      throw new HttpError(500, null, '');
    });
    const http = { request: vi.fn(), requestJson } as unknown as HttpClient;
    await expect(createRdwApi(http).lookupByRegistrationNumber('AB123C')).rejects.toBeInstanceOf(
      HttpError,
    );
  });
});
