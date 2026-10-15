import { describe, expect, it, vi } from 'vitest';
import type { HttpClient } from '@/shared/api/http-client';
import type { MultipartUploadFiles } from '@/shared/platform/ports';
import { createPhotosApi, photoApiPath } from './photos-api';

const BASE = 'https://api.example.test/backend/';

describe('photoApiPath', () => {
  it('keeps a relative API path', () => {
    expect(photoApiPath('/api/binary/photo/1', BASE)).toBe('/api/binary/photo/1');
  });

  it('turns an absolute URL under the API base into a path', () => {
    expect(photoApiPath('https://api.example.test/backend/api/binary/photo/1?x=1', BASE)).toBe(
      '/api/binary/photo/1?x=1',
    );
  });

  it('never treats another host as the API', () => {
    expect(photoApiPath('https://storage.example.test/photo/1.jpg', BASE)).toBeNull();
    expect(photoApiPath('https://api.example.test.evil.test/backend/x', BASE)).toBeNull();
    expect(photoApiPath('//api.example.test/backend/x', BASE)).toBeNull();
  });

  it('does not match a sibling path that only shares the prefix', () => {
    expect(photoApiPath('https://api.example.test/backend-other/x', BASE)).toBeNull();
  });
});

describe('photos api download', () => {
  const files = {} as MultipartUploadFiles;

  it('downloads an API photo through the authenticated client', async () => {
    const requestBytes = vi.fn(async () => new Uint8Array([1, 2]));
    const http = { requestBytes } as unknown as HttpClient;

    await expect(
      createPhotosApi(http, files, BASE).download('https://api.example.test/backend/p/1'),
    ).resolves.toEqual(new Uint8Array([1, 2]));
    expect(requestBytes).toHaveBeenCalledWith(
      '/p/1',
      expect.objectContaining({ headers: { Accept: 'image/*' } }),
    );
  });

  it('does not download photos from other hosts with the session', async () => {
    const requestBytes = vi.fn();
    const http = { requestBytes } as unknown as HttpClient;

    await expect(
      createPhotosApi(http, files, BASE).download('https://storage.example.test/p/1.jpg'),
    ).resolves.toBeNull();
    expect(requestBytes).not.toHaveBeenCalled();
  });
});
