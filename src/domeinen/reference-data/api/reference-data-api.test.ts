import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@/shared/api/http-client';
import { createReferenceDataApi } from './reference-data-api';

function setup(response: unknown) {
  const requestJson = vi.fn(
    async (_path: string, schema: { parse(value: unknown): unknown }, _options?: unknown) =>
      schema.parse(response),
  );
  const http = { request: vi.fn(), requestJson } as unknown as HttpClient;
  return { api: createReferenceDataApi({ http }), requestJson };
}

describe('fetchSchema', () => {
  it('calls the schema endpoint for the language code, without a header on the first sync', async () => {
    const { api, requestJson } = setup(['dn_servicetype', 'dn_optionset']);

    const entities = await api.fetchSchema(1043, undefined);

    expect(entities).toEqual(['dn_servicetype', 'dn_optionset']);
    expect(requestJson.mock.calls[0]?.[0]).toBe('/api/client-sync/schema/1043');
    expect(requestJson.mock.calls[0]?.[2]).toEqual({ headers: undefined });
  });

  it('sends the since date as the SINCEDATE header', async () => {
    const { api, requestJson } = setup([]);

    await api.fetchSchema(1043, '2026-09-22T10:00:00.000Z');

    expect(requestJson.mock.calls[0]?.[2]).toEqual({
      headers: { SINCEDATE: '2026-09-22T10:00:00.000Z' },
    });
  });
});

describe('fetchEntity', () => {
  it('calls the entity endpoint, encoding the name into the path', async () => {
    const { api, requestJson } = setup([{ id: 1 }, { id: 2 }]);

    const data = await api.fetchEntity('dn_service type', 1043);

    expect(data).toEqual([{ id: 1 }, { id: 2 }]);
    expect(requestJson.mock.calls[0]?.[0]).toBe('/api/client-sync/dn_service%20type/1043');
  });
});
