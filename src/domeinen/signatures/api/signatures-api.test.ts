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

function createUploadFiles() {
  const remove = vi.fn(async () => undefined);
  let multipart: FormData | undefined;
  const files = {
    prepare: vi.fn(async () => ({
      appendTo(body: FormData, fieldName: string) {
        multipart = body;
        body.append(fieldName, 'prepared-jpeg');
      },
      remove,
    })),
  };
  return { files, remove, multipart: () => multipart };
}

describe('createSignaturesApi', () => {
  it('posts multipart signature data', async () => {
    const request = vi.fn(async () => undefined);
    const http = { request, requestJson: vi.fn() } as unknown as HttpClient;
    const { files, remove, multipart } = createUploadFiles();
    await createSignaturesApi(http, files).upload(input);
    expect(files.prepare).toHaveBeenCalledWith(input.fileBytes, {
      name: 'signature.jpg',
      type: 'image/jpeg',
    });
    expect(remove).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith(
      '/api/signatures',
      expect.objectContaining({
        method: 'POST',
        responseType: 'none',
        body: expect.any(FormData),
      }),
    );
    expect(multipart()).toBeInstanceOf(FormData);
    const body = multipart() as FormData;
    expect(body.get('incidentId')).toBe(input.incidentId);
    expect(body.get('serviceId')).toBe(input.serviceId);
    expect(body.get('fileExtension')).toBe('.jpg');
    expect(body.get('name')).toBe(input.name);
    expect(body.get('email')).toBe(input.email);
    expect(body.get('phase')).toBe(input.phase);
    expect(body.get('signatureType')).toBe(input.signatureType);
    expect(body.get('file')).toBe('prepared-jpeg');
  });

  it('treats HTTP 409 as success', async () => {
    const request = vi.fn(async () => {
      throw new HttpError(409, null, '');
    });
    const http = { request, requestJson: vi.fn() } as unknown as HttpClient;
    const { files, remove } = createUploadFiles();
    await expect(createSignaturesApi(http, files).upload(input)).resolves.toBeUndefined();
    expect(remove).toHaveBeenCalledOnce();
  });

  it('rethrows other HTTP errors', async () => {
    const request = vi.fn(async () => {
      throw new HttpError(500, null, '');
    });
    const http = { request, requestJson: vi.fn() } as unknown as HttpClient;
    const { files, remove } = createUploadFiles();
    await expect(createSignaturesApi(http, files).upload(input)).rejects.toBeInstanceOf(HttpError);
    expect(remove).toHaveBeenCalledOnce();
  });

  it('uploads without constructing a byte Blob unsupported by React Native', async () => {
    const { files } = createUploadFiles();
    const request = vi.fn(async () => undefined);
    const http = { request, requestJson: vi.fn() } as unknown as HttpClient;
    vi.stubGlobal(
      'Blob',
      class {
        constructor() {
          throw new Error('Creating blobs from ArrayBuffer views is unsupported');
        }
      },
    );
    try {
      await expect(createSignaturesApi(http, files).upload(input)).resolves.toBeUndefined();
      expect(request).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('keeps the file available until the request finishes and supports a custom filename', async () => {
    const { files, remove } = createUploadFiles();
    const request = vi.fn(async () => {
      expect(remove).not.toHaveBeenCalled();
    });
    const http = { request, requestJson: vi.fn() } as unknown as HttpClient;
    await createSignaturesApi(http, files).upload({ ...input, fileName: 'sender.jpg' });
    expect(files.prepare).toHaveBeenCalledWith(input.fileBytes, {
      name: 'sender.jpg',
      type: 'image/jpeg',
    });
    expect(remove).toHaveBeenCalledOnce();
  });
});
