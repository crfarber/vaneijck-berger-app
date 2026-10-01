import { describe, expect, it, vi } from 'vitest';
import type { LocationReader } from '@/domeinen/location';
import { HttpError, NetworkError } from '@/shared/api/errors';
import type { HttpClient } from '@/shared/api/http-client';
import { createFakeClock, createFakeScheduler, createInMemoryStore } from '@/test/fakes';
import { createPhotosApi, type PhotosApi } from '../api/photos-api';
import { PHOTO_STATUS } from '../domain/types';
import { createInMemoryPhotoFiles } from './photo-files';
import { openPhoto, sealPhoto } from './photo-encryption';
import { createPhotoRepository } from './photo-repository';
import { createPhotoService, migrateLegacyPhotos } from './photo-service';

function locationReader(valid = true): LocationReader {
  return {
    getCurrent: async () =>
      valid ? { isValid: true, latitude: 52.1, longitude: 5.1 } : { isValid: false },
  };
}

function setup(
  options: {
    upload?: PhotosApi['upload'];
    list?: PhotosApi['list'];
    locationValid?: boolean;
  } = {},
) {
  const clock = createFakeClock();
  const scheduler = createFakeScheduler();
  const store = createInMemoryStore();
  const files = createInMemoryPhotoFiles({
    'file:///camera/shot.jpg': new Uint8Array([1, 2, 3]),
  });
  const upload = vi.fn(
    options.upload ??
      (async () => {
        /* ok */
      }),
  );
  const list = vi.fn(
    options.list ??
      (async () => {
        return [];
      }),
  );
  const api: PhotosApi = { upload, list };
  const service = createPhotoService({
    api,
    files,
    repository: createPhotoRepository(store),
    locationReader: locationReader(options.locationValid !== false),
    clock,
    scheduler,
  });
  service.start();
  return { service, upload, list, files, store, scheduler, clock };
}

describe('photo service queue', () => {
  it('migrates legacy photo files before removing their old metadata', async () => {
    const oldStore = createInMemoryStore();
    const secureStore = createInMemoryStore();
    const oldRepository = createPhotoRepository(oldStore);
    const newRepository = createPhotoRepository(secureStore);
    const files = createInMemoryPhotoFiles({ '/photos/old.jpg': new Uint8Array([1, 2, 3]) });
    await oldRepository.save([
      {
        id: 'old',
        serviceId: 'svc-1',
        incidentId: 'inc-1',
        allocationId: 'alloc-1',
        phase: 'load',
        position: { category: 'DASHBOARD' },
        filePath: '/photos/old.jpg',
        coordinate: null,
        takenAt: 1,
        status: PHOTO_STATUS.queued,
      },
    ]);

    await migrateLegacyPhotos(oldRepository, newRepository, files);

    expect(await oldRepository.load()).toEqual([]);
    expect((await newRepository.load())[0]?.filePath).toContain('old.bin');
    expect(files.dump()['/photos/old.jpg']).toBeUndefined();
  });

  it('keeps CRM photo metadata for the same service when the network is unavailable', async () => {
    let online = true;
    const summary = {
      url: 'https://example.invalid/photo',
      phase: 'load' as const,
      position: { category: 'DASHBOARD' as const },
      isExtra: false,
    };
    const { service } = setup({
      list: async () => {
        if (!online) throw new NetworkError();
        return [summary];
      },
    });
    const request = {
      allocationId: 'alloc-1',
      incidentId: 'inc-1',
      serviceId: 'svc-1',
      phase: 'load' as const,
    };

    expect(await service.listServerPhotos(request)).toEqual([summary]);
    online = false;
    expect(await service.listServerPhotos(request)).toEqual([summary]);
    await service.clearForAllocation('alloc-1');
    await expect(service.listServerPhotos(request)).rejects.toBeInstanceOf(NetworkError);
  });

  it('keeps stored photo bytes confidential and rejects changes', () => {
    const key = new Uint8Array(32).fill(12);
    const nonce = new Uint8Array(12).fill(17);
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0x00]);
    const sealed = sealPhoto(key, nonce, jpeg);

    expect(sealed).not.toEqual(jpeg);
    expect(openPhoto(key, sealed)).toEqual(jpeg);
    sealed[sealed.length - 1] = (sealed[sealed.length - 1] ?? 0) ^ 1;
    expect(() => openPhoto(key, sealed)).toThrow();
  });

  it('uploads a captured photo and marks it sent', async () => {
    const { service, upload } = setup();

    const photo = await service.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      position: { category: 'DASHBOARD' },
      sourceUri: 'file:///camera/shot.jpg',
    });
    await service.processNow();

    expect(upload).toHaveBeenCalledTimes(1);
    expect(upload.mock.calls[0]?.[0]).toMatchObject({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      isExtra: false,
      comment: 'Aanvang',
      fileName: `${photo.id}.jpg`,
      imagePosition: { name: 'Dashboard' },
    });
    const listed = await service.listByService('svc-1');
    expect(listed[0]?.id).toBe(photo.id);
    expect(listed[0]?.status).toBe(PHOTO_STATUS.sent);
  });

  it('keeps the file and retries after a temporary failure', async () => {
    const upload = vi
      .fn()
      .mockRejectedValueOnce(new NetworkError())
      .mockResolvedValueOnce(undefined);
    const { service, files, scheduler } = setup({ upload });

    await service.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      position: { category: 'DASHBOARD' },
      sourceUri: 'file:///camera/shot.jpg',
    });
    await service.processNow();

    expect((await service.listByService('svc-1'))[0]?.status).toBe(PHOTO_STATUS.queued);
    expect(Object.keys(files.dump()).some((path) => path.startsWith('/photos/'))).toBe(true);

    await scheduler.fireNext();
    await service.processNow();

    expect(upload).toHaveBeenCalledTimes(2);
    expect((await service.listByService('svc-1'))[0]?.status).toBe(PHOTO_STATUS.sent);
  });

  it('marks a hard 4xx as failed without deleting the file', async () => {
    const upload = vi.fn().mockRejectedValue(new HttpError(400, null, 'bad'));
    const { service, files } = setup({ upload });

    await service.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      position: { category: 'DASHBOARD' },
      sourceUri: 'file:///camera/shot.jpg',
    });
    await service.processNow();

    const listed = await service.listByService('svc-1');
    expect(listed[0]?.status).toBe(PHOTO_STATUS.failed);
    expect(files.dump()[listed[0]?.filePath ?? '']).toBeDefined();

    await service.retry(listed[0]?.id ?? '');
    upload.mockResolvedValueOnce(undefined);
    await service.processNow();
    expect((await service.listByService('svc-1'))[0]?.status).toBe(PHOTO_STATUS.sent);
  });

  it('marks the second photo of the same type as extra', async () => {
    const { service, upload } = setup();

    await service.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      position: { category: 'DASHBOARD' },
      sourceUri: 'file:///camera/shot.jpg',
    });
    await service.processNow();
    await service.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      position: { category: 'DASHBOARD' },
      sourceUri: 'file:///camera/shot.jpg',
    });
    await service.processNow();

    expect(upload.mock.calls[0]?.[0].isExtra).toBe(false);
    expect(upload.mock.calls[1]?.[0].isExtra).toBe(true);
  });

  it('waits when there is no location instead of dropping the file', async () => {
    const { service, upload } = setup({ locationValid: false });

    await service.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      position: { category: 'DASHBOARD' },
      sourceUri: 'file:///camera/shot.jpg',
    });
    await service.processNow();

    expect(upload).not.toHaveBeenCalled();
    expect((await service.listByService('svc-1'))[0]?.status).toBe(PHOTO_STATUS.queued);
  });

  it('clears only the photos of one service', async () => {
    const { service, files } = setup();

    await service.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      position: { category: 'DASHBOARD' },
      sourceUri: 'file:///camera/shot.jpg',
    });
    await service.processNow();
    await service.capture({
      serviceId: 'svc-2',
      incidentId: 'inc-2',
      allocationId: 'alloc-2',
      phase: 'load',
      position: { category: 'DASHBOARD' },
      sourceUri: 'file:///camera/shot.jpg',
    });
    await service.processNow();

    await service.clearForService('svc-1');

    expect(await service.listByService('svc-1')).toEqual([]);
    expect((await service.listByService('svc-2')).length).toBe(1);
    expect(Object.keys(files.dump()).filter((path) => path.startsWith('/photos/')).length).toBe(1);
  });

  it('clears all photos of one finished allocation without touching another', async () => {
    const { service, files } = setup();
    for (const [serviceId, allocationId] of [
      ['svc-1', 'alloc-1'],
      ['svc-2', 'alloc-1'],
      ['svc-3', 'alloc-2'],
    ] as const) {
      await service.capture({
        serviceId,
        allocationId,
        incidentId: 'inc-1',
        phase: 'load',
        position: { category: 'DASHBOARD' },
        sourceUri: 'file:///camera/shot.jpg',
      });
      await service.processNow();
    }

    await service.clearForAllocation('alloc-1');

    expect(await service.listByService('svc-1')).toEqual([]);
    expect(await service.listByService('svc-2')).toEqual([]);
    expect(await service.listByService('svc-3')).toHaveLength(1);
    expect(Object.keys(files.dump()).filter((path) => path.startsWith('/photos/'))).toHaveLength(1);
  });

  it('clears everything on clearAll', async () => {
    const { service, files } = setup();
    await service.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      position: { category: 'DASHBOARD' },
      sourceUri: 'file:///camera/shot.jpg',
    });
    await service.processNow();
    await service.clearAll();
    expect(await service.listByService('svc-1')).toEqual([]);
    expect(Object.keys(files.dump()).filter((path) => path.startsWith('/photos/'))).toEqual([]);
  });

  it('loads server photos through the API', async () => {
    const listed = [
      {
        url: 'https://cdn.example/photos/1.jpg',
        phase: 'load' as const,
        position: { category: 'EXTERIOR' as const, angle: 'links-achter' as const },
        isExtra: false,
      },
    ];
    const list = vi.fn(async () => listed);
    const { service } = setup({ list });

    const result = await service.listServerPhotos({
      incidentId: 'inc-1',
      serviceId: 'svc-1',
      phase: 'load',
    });

    expect(list).toHaveBeenCalledWith({
      incidentId: 'inc-1',
      serviceId: 'svc-1',
      phase: 'load',
    });
    expect(result).toEqual(listed);
  });
});

describe('photos api multipart', () => {
  it('posts the form fields the backend expects', async () => {
    const request = vi.fn(async () => undefined);
    const http = { request, requestJson: vi.fn() } as unknown as HttpClient;
    const api = createPhotosApi(http);

    await api.upload({
      incidentId: 'inc-1',
      serviceId: 'svc-1',
      coordinate: { latitude: 1, longitude: 2 },
      imagePosition: { name: 'Buitenkant', position: 'links-voor' },
      fileName: 'a.jpg',
      fileBytes: new Uint8Array([9]),
      comment: 'Aanvang',
      createdDateTime: 'Mon, 21 Sep 2026 12:00:00 GMT',
      isExtra: true,
    });

    expect(request).toHaveBeenCalledWith(
      '/api/binary/upload',
      expect.objectContaining({
        method: 'POST',
        query: { content: 'photo' },
        responseType: 'none',
      }),
    );
    const call = request.mock.calls[0] as unknown as
      [string, { body?: FormData } | undefined] | undefined;
    const body = call?.[1]?.body;
    expect(body).toBeInstanceOf(FormData);
    expect(body?.get('IncidentId')).toBe('inc-1');
    expect(body?.get('ServiceId')).toBe('svc-1');
    expect(body?.get('isExtra')).toBe('true');
    expect(body?.get('overrideExisting')).toBe('false');
    expect(body?.get('ImagePosition')).toBe(
      JSON.stringify({ name: 'Buitenkant', position: 'links-voor' }),
    );
  });
});

describe('photos api list', () => {
  it('loads one phase and maps server labels to domain positions', async () => {
    const requestJson = vi.fn(async (_path: string, schema: { parse(value: unknown): unknown }) =>
      schema.parse([
        {
          url: 'https://cdn.example/photo-1.jpg',
          phase: 'Aanvang',
          position: 'links-achter',
          photoType: 'Buitenkant',
          isExtra: false,
        },
        {
          url: 'https://cdn.example/photo-2.jpg',
          phase: 'Onbekend',
          position: 'rechts-voor',
          photoType: 'Banden',
          isExtra: true,
        },
        {
          url: 'https://cdn.example/photo-3.jpg',
          phase: 'Aanvang',
          position: null,
          photoType: 'Afgifteformulier',
          isExtra: false,
        },
      ]),
    );
    const http = { request: vi.fn(), requestJson } as unknown as HttpClient;
    const api = createPhotosApi(http);

    const listed = await api.list({
      incidentId: 'inc/1',
      serviceId: 'svc 1',
      phase: 'load',
    });

    expect(requestJson.mock.calls[0]?.[0]).toBe('/api/binary/photos/inc%2F1/svc%201/Aanvang');
    expect(listed).toEqual([
      {
        url: 'https://cdn.example/photo-1.jpg',
        phase: 'load',
        position: { category: 'EXTERIOR', angle: 'links-achter' },
        isExtra: false,
      },
      {
        url: 'https://cdn.example/photo-2.jpg',
        phase: 'load',
        position: { category: 'TYRES', tyre: 'rechts-voor' },
        isExtra: true,
      },
    ]);
  });
});
