import { describe, expect, it, vi } from 'vitest';
import type { LocationReader } from '@/domeinen/location';
import { HttpError, NetworkError } from '@/shared/api/errors';
import type { HttpClient } from '@/shared/api/http-client';
import {
  createFakeClock,
  createFakeScheduler,
  createInMemoryStore,
  deferred,
  flushPromises,
} from '@/test/fakes';
import { createPhotosApi, type PhotosApi } from '../api/photos-api';
import { PHOTO_STATUS } from '../domain/types';
import { createInMemoryPhotoFiles } from './photo-files';
import { openPhoto, sealPhoto } from './photo-encryption';
import { createPhotoLocationReader } from './photo-location-reader';
import { createPhotoRepository } from './photo-repository';
import { createPhotoService, migrateLegacyPhotos } from './photo-service';

function locationReader(valid = true): LocationReader {
  return {
    getCurrent: async () =>
      valid ? { isValid: true, latitude: 52.1, longitude: 5.1 } : { isValid: false },
  };
}

describe('photo location reader', () => {
  it('uses the simulator test location when no usable fix is available', async () => {
    const reader = createPhotoLocationReader(locationReader(false), true);

    await expect(reader.getCurrent()).resolves.toEqual({
      isValid: true,
      latitude: 52.0803,
      longitude: 4.3244,
    });
  });

  it('preserves a usable device location', async () => {
    const current = { isValid: true, latitude: 52.1, longitude: 5.1 } as const;
    const reader = createPhotoLocationReader({ getCurrent: async () => current }, true);

    await expect(reader.getCurrent()).resolves.toEqual(current);
  });

  it('does not use the simulator test location when the fallback is disabled', async () => {
    const reader = createPhotoLocationReader(locationReader(false), false);

    await expect(reader.getCurrent()).resolves.toEqual({ isValid: false });
  });

  it('replaces the invalid zero coordinate with the simulator test location', async () => {
    const reader = createPhotoLocationReader(
      { getCurrent: async () => ({ isValid: true, latitude: 0, longitude: 0 }) },
      true,
    );

    await expect(reader.getCurrent()).resolves.toEqual({
      isValid: true,
      latitude: 52.0803,
      longitude: 4.3244,
    });
  });
});

function setup(
  options: {
    upload?: PhotosApi['upload'];
    list?: PhotosApi['list'];
    download?: PhotosApi['download'];
    locationValid?: boolean;
    locationReader?: LocationReader;
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
  const download = vi.fn(options.download ?? (async () => new Uint8Array([7, 7])));
  const api: PhotosApi = { upload, list, download };
  const repository = createPhotoRepository(store);
  const service = createPhotoService({
    api,
    files,
    repository,
    locationReader: options.locationReader ?? locationReader(options.locationValid !== false),
    clock,
    scheduler,
  });
  service.start();
  return { service, upload, list, download, files, store, scheduler, clock, repository };
}

describe('local-first server photos', () => {
  const input = {
    allocationId: 'alloc-1',
    incidentId: 'inc-1',
    serviceId: 'svc-1',
    phase: 'load' as const,
  };
  const position = { category: 'DASHBOARD' as const };
  const remote = {
    url: 'https://api.test/api/binary/photo/1',
    phase: 'load' as const,
    position,
    isExtra: false,
  };

  it('does not contact the server when a required photo is already captured locally', async () => {
    const { service, list, download } = setup();
    await service.capture({ ...input, position, sourceUri: 'file:///camera/shot.jpg' });

    await expect(service.listServerPhotos(input, [position])).resolves.toEqual([]);

    expect(list).not.toHaveBeenCalled();
    expect(download).not.toHaveBeenCalled();
  });

  it('stores missing server photos and reuses them on the next visit', async () => {
    const { service, list, download, files } = setup({ list: async () => [remote] });

    await expect(service.listServerPhotos(input, [position])).resolves.toEqual([remote]);
    await expect(service.listServerPhotos(input, [position])).resolves.toEqual([remote]);

    expect(list).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledTimes(1);
    expect(await files.remoteDisplayUri(input.allocationId, remote.url)).not.toBeNull();
  });

  it('looks for server photos on an empty device even without mandatory positions', async () => {
    const { service, list, download } = setup({ list: async () => [remote] });

    await expect(service.listServerPhotos(input, [])).resolves.toEqual([remote]);
    await expect(service.listServerPhotos(input, [])).resolves.toEqual([remote]);

    expect(list).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('reuses durable metadata and files after recreating the service', async () => {
    const { service, list, download, upload, files, store, clock, scheduler } = setup({
      list: async () => [remote],
    });
    await service.listServerPhotos(input, [position]);
    service.stop();
    const reopened = createPhotoService({
      api: { list, download, upload },
      files,
      repository: createPhotoRepository(store),
      clock,
      scheduler,
      locationReader: locationReader(),
    });

    await expect(reopened.listServerPhotos(input, [position])).resolves.toEqual([remote]);

    expect(list).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('downloads a missing file again rather than trusting metadata alone', async () => {
    const { service, files, list, download } = setup({ list: async () => [remote] });
    await service.listServerPhotos(input, [position]);
    const stored = await files.remoteDisplayUri(input.allocationId, remote.url);
    expect(stored).not.toBeNull();
    if (stored !== null) await files.remove(stored);

    await service.listServerPhotos(input, [position]);

    expect(list).toHaveBeenCalledTimes(2);
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('downloads only server photos without a matching sent local copy', async () => {
    const second = {
      ...remote,
      url: `${remote.url}/second`,
      position: { category: 'ROOF' as const },
    };
    const { service, repository, list, download } = setup({ list: async () => [remote, second] });
    const local = await service.capture({
      ...input,
      position,
      sourceUri: 'file:///camera/shot.jpg',
    });
    await repository.save([{ ...local, status: PHOTO_STATUS.sent }]);

    await expect(service.listServerPhotos(input, [position, second.position])).resolves.toEqual([
      remote,
      second,
    ]);
    await service.listServerPhotos(input, [position, second.position]);

    expect(list).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledExactlyOnceWith(second.url);
  });

  it('does not count a sent local copy and its server metadata twice', async () => {
    const { service, repository, list } = setup({ list: async () => [remote] });
    const local = await service.capture({
      ...input,
      position,
      sourceUri: 'file:///camera/shot.jpg',
    });
    await repository.save([{ ...local, status: PHOTO_STATUS.sent }]);
    await repository.saveServer(input, [remote]);

    await service.listServerPhotos(input, [position, position]);

    expect(list).toHaveBeenCalledTimes(1);
  });

  it('does not count failed local photos as available', async () => {
    const { service, repository, list } = setup({ list: async () => [remote] });
    const local = await service.capture({
      ...input,
      position,
      sourceUri: 'file:///camera/shot.jpg',
    });
    await repository.save([{ ...local, status: PHOTO_STATUS.failed }]);

    await expect(service.listServerPhotos(input, [position])).resolves.toEqual([remote]);

    expect(list).toHaveBeenCalledTimes(1);
  });

  it('preserves downloaded extras without fetching new images when requirements are covered', async () => {
    const extra = { ...remote, url: `${remote.url}/extra`, isExtra: true };
    const { service, list, download } = setup({ list: async () => [remote, extra] });

    await service.listServerPhotos(input, [position]);
    await expect(service.listServerPhotos(input, [position])).resolves.toEqual([remote, extra]);

    expect(list).toHaveBeenCalledTimes(1);
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('does not restore server metadata or files after the allocation is cleared during lookup', async () => {
    const response = deferred<(typeof remote)[]>();
    const { service, repository, download, list } = setup({ list: () => response.promise });
    const loading = service.listServerPhotos(input, [position]);
    await vi.waitFor(() => expect(list).toHaveBeenCalledTimes(1));
    await service.clearForAllocation(input.allocationId);
    response.resolve([remote]);
    await loading;

    expect(await repository.loadServer(input)).toBeNull();
    expect(download).not.toHaveBeenCalled();
  });
});

describe('server photos without a local copy', () => {
  const url = 'https://api.test/api/binary/photo/1';

  it('downloads once and serves the stored copy afterwards', async () => {
    const { service, download, files } = setup();

    const first = await service.serverPhotoUri({ allocationId: 'alloc-1', url });
    const second = await service.serverPhotoUri({ allocationId: 'alloc-1', url });

    expect(download).toHaveBeenCalledTimes(1);
    expect(second).toBe(first);
    expect(files.dump()[first]).toEqual(new Uint8Array([7, 7]));
  });

  it('shares one download between simultaneous requests', async () => {
    const bytes = deferred<Uint8Array | null>();
    const { service, download } = setup({ download: () => bytes.promise });

    const first = service.serverPhotoUri({ allocationId: 'alloc-1', url });
    const second = service.serverPhotoUri({ allocationId: 'alloc-1', url });
    bytes.resolve(new Uint8Array([1]));

    expect(await first).toBe(await second);
    expect(download).toHaveBeenCalledTimes(1);
  });

  it('uses a non-API url as-is without storing anything', async () => {
    const { service, files } = setup({ download: async () => null });

    await expect(service.serverPhotoUri({ allocationId: 'alloc-1', url })).resolves.toBe(url);
    expect(Object.keys(files.dump()).filter((path) => path.startsWith('/remote/'))).toEqual([]);
  });

  it('tries again after a failed download', async () => {
    const download = vi
      .fn<PhotosApi['download']>()
      .mockRejectedValueOnce(new NetworkError())
      .mockResolvedValue(new Uint8Array([3]));
    const { service } = setup({ download });

    await expect(service.serverPhotoUri({ allocationId: 'alloc-1', url })).rejects.toBeInstanceOf(
      NetworkError,
    );
    await expect(service.serverPhotoUri({ allocationId: 'alloc-1', url })).resolves.toContain(
      '/remote/alloc-1/',
    );
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('removes downloaded copies when the allocation is finished', async () => {
    const { service, files } = setup();
    await service.serverPhotoUri({ allocationId: 'alloc-1', url });
    await service.serverPhotoUri({ allocationId: 'alloc-2', url });

    await service.clearForAllocation('alloc-1');

    const remote = Object.keys(files.dump()).filter((path) => path.startsWith('/remote/'));
    expect(remote.map((path) => path.split('/')[2])).toEqual(['alloc-2']);
  });

  it('removes all downloaded copies on clearAll', async () => {
    const { service, files } = setup();
    await service.serverPhotoUri({ allocationId: 'alloc-1', url });

    await service.clearAll();

    expect(Object.keys(files.dump()).filter((path) => path.startsWith('/remote/'))).toEqual([]);
  });

  it('does not keep a download that finishes after the allocation was cleared', async () => {
    const bytes = deferred<Uint8Array | null>();
    const { service, files } = setup({ download: () => bytes.promise });

    const loading = service.serverPhotoUri({ allocationId: 'alloc-1', url });
    await flushPromises();
    await service.clearForAllocation('alloc-1');
    bytes.resolve(new Uint8Array([1]));

    await expect(loading).resolves.toBe(url);
    expect(Object.keys(files.dump()).filter((path) => path.startsWith('/remote/'))).toEqual([]);
  });
});

describe('photo service queue', () => {
  it('keeps the first position when its upload completes during the next capture', async () => {
    const uploadStarted = deferred<void>();
    const uploadFinished = deferred<void>();
    const saveStarted = deferred<void>();
    const saveFinished = deferred<void>();
    const { service, repository } = setup({
      upload: async () => {
        uploadStarted.resolve();
        await uploadFinished.promise;
      },
    });
    const context = {
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load' as const,
      sourceUri: 'file:///camera/shot.jpg',
    };
    await service.capture({ ...context, position: { category: 'EXTERIOR', angle: 'links-voor' } });
    const submitting = service.submitBatch('svc-1', 'load');
    await uploadStarted.promise;
    const save = repository.save;
    let paused = false;
    repository.save = async (photos) => {
      if (!paused && photos.some((photo) => photo.status === PHOTO_STATUS.sent)) {
        paused = true;
        saveStarted.resolve();
        await saveFinished.promise;
      }
      await save(photos);
    };
    uploadFinished.resolve();
    await saveStarted.promise;
    const capturing = service.capture({
      ...context,
      position: { category: 'EXTERIOR', angle: 'rechts-achter' },
    });
    await flushPromises();
    saveFinished.resolve();
    await capturing;
    await submitting;
    expect((await service.listByService('svc-1')).map((photo) => photo.position)).toEqual([
      { category: 'EXTERIOR', angle: 'links-voor' },
      { category: 'EXTERIOR', angle: 'rechts-achter' },
    ]);
  });

  it('allows another capture after a previous metadata write failed', async () => {
    const { service, repository } = setup();
    service.stop();
    const save = repository.save;
    let fail = true;
    repository.save = async (photos) => {
      if (fail) {
        fail = false;
        throw new Error('Storage unavailable');
      }
      await save(photos);
    };
    const input = {
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load' as const,
      position: { category: 'DASHBOARD' as const },
      sourceUri: 'file:///camera/shot.jpg',
    };
    await expect(service.capture(input)).rejects.toThrow('Storage unavailable');
    const photo = await service.capture(input);
    expect((await service.listByService('svc-1')).map((item) => item.id)).toEqual([photo.id]);
  });

  it('keeps both required positions when captures overlap before any upload', async () => {
    const { service, files } = setup();
    service.stop();
    const context = {
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load' as const,
      sourceUri: 'file:///camera/shot.jpg',
    };
    const captures = await Promise.all([
      service.capture({ ...context, position: { category: 'EXTERIOR', angle: 'links-voor' } }),
      service.capture({ ...context, position: { category: 'EXTERIOR', angle: 'rechts-achter' } }),
    ]);
    const photos = await service.listByService('svc-1');
    expect(photos.map((photo) => photo.position)).toEqual(captures.map((photo) => photo.position));
    expect(photos).toHaveLength(2);
    expect(photos.every((photo) => photo.status === PHOTO_STATUS.draft)).toBe(true);
    for (const photo of captures) {
      expect(files.dump()[photo.filePath]).toBeDefined();
    }
  });

  it('preserves a locally failed photo without retrying it forever or blocking later photos', async () => {
    const upload = vi
      .fn()
      .mockRejectedValueOnce(new Error('Unsupported byte Blob'))
      .mockResolvedValue(undefined);
    const { service, files, scheduler } = setup({ upload });
    const capture = {
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load' as const,
      position: { category: 'DASHBOARD' as const },
      sourceUri: 'file:///camera/shot.jpg',
    };
    await service.capture(capture);
    await service.submitBatch('svc-1', 'load');
    await service.capture(capture);
    await service.submitBatch('svc-1', 'load');
    const photos = await service.listByService('svc-1');
    expect(photos.map((photo) => photo.status)).toEqual([PHOTO_STATUS.failed, PHOTO_STATUS.sent]);
    expect(files.dump()[photos[0]?.filePath ?? '']).toBeDefined();
    expect(scheduler.pending()).toHaveLength(0);
    await service.retry(photos[0]?.id ?? '');
    await service.processNow();
    expect((await service.listByService('svc-1'))[0]?.status).toBe(PHOTO_STATUS.sent);
  });

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
        role: 'mandatory',
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

  it('marks a new additional photo as extra when the same type exists on the server', async () => {
    const summary = {
      url: 'https://example.invalid/photo',
      phase: 'load' as const,
      position: { category: 'ROOF' as const },
      isExtra: false,
    };
    const { service, upload } = setup({ list: async () => [summary] });
    await service.listServerPhotos({
      allocationId: 'alloc-1',
      incidentId: 'inc-1',
      serviceId: 'svc-1',
      phase: 'load',
    });
    await service.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      role: 'additional',
      position: { category: 'ROOF' },
      sourceUri: 'file:///camera/shot.jpg',
    });

    await service.submitBatch('svc-1', 'load');

    expect(upload.mock.calls[0]?.[0].isExtra).toBe(true);
  });

  it('preserves the target isExtra value when overriding a server photo', async () => {
    const { service, upload } = setup();
    const replacement = await service.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      role: 'mandatory',
      position: { category: 'ROOF' },
      sourceUri: 'file:///camera/shot.jpg',
      overrideExisting: true,
      isExtraOverride: true,
    });

    await service.submitOverride(replacement.id);

    expect(upload.mock.calls[0]?.[0]).toMatchObject({
      isExtra: true,
      overrideExisting: true,
    });
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

  it('keeps a captured photo local until its phase is submitted', async () => {
    const { service, upload } = setup();
    service.start();

    const photo = await service.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      position: { category: 'DASHBOARD' },
      role: 'additional',
      sourceUri: 'file:///camera/shot.jpg',
    });
    await service.processNow();

    expect(upload).not.toHaveBeenCalled();
    expect((await service.listByService('svc-1'))[0]?.status).toBe(PHOTO_STATUS.draft);
    expect((await service.listByService('svc-1'))[0]?.role).toBe('additional');

    await service.submitBatch('svc-1', 'load');

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

  it('submits one replacement separately from the normal phase batch', async () => {
    const { service, upload } = setup();
    const input = {
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load' as const,
      role: 'mandatory' as const,
      position: { category: 'DASHBOARD' as const },
      sourceUri: 'file:///camera/shot.jpg',
    };

    await service.capture(input);
    await service.submitBatch('svc-1', 'load');
    const replacement = await service.capture({ ...input, overrideExisting: true });

    await service.submitBatch('svc-1', 'load');
    expect(upload).toHaveBeenCalledTimes(1);

    await service.submitOverride(replacement.id);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(upload.mock.calls[1]?.[0]).toMatchObject({
      fileName: `${replacement.id}.jpg`,
      overrideExisting: true,
    });
  });

  it('replaces an unsent local draft instead of adding a duplicate', async () => {
    const { service, files } = setup();
    const input = {
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load' as const,
      role: 'mandatory' as const,
      position: { category: 'DASHBOARD' as const },
      sourceUri: 'file:///camera/shot.jpg',
    };
    const first = await service.capture(input);

    const replacement = await service.capture({ ...input, replacePhotoId: first.id });

    expect(await service.listByService('svc-1')).toEqual([replacement]);
    expect(files.dump()[first.filePath]).toBeUndefined();
    expect(files.dump()[replacement.filePath]).toBeDefined();
  });

  it('defers GPS until attachLocation so capture does not wait on the location reader', async () => {
    const getCurrent = vi.fn(async () => ({
      isValid: true as const,
      latitude: 52.1,
      longitude: 5.1,
    }));
    const { service } = setup({ locationReader: { getCurrent } });

    await service.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      position: { category: 'DASHBOARD' },
      sourceUri: 'file:///camera/shot.jpg',
    });

    expect(getCurrent).not.toHaveBeenCalled();
    expect((await service.listByService('svc-1'))[0]?.coordinate).toBeNull();

    await expect(service.attachLocation({ serviceId: 'svc-1', phase: 'load' })).resolves.toBe(true);
    expect(getCurrent).toHaveBeenCalledOnce();
    expect((await service.listByService('svc-1'))[0]?.coordinate).toEqual({
      latitude: 52.1,
      longitude: 5.1,
    });
  });

  it('rejects attachLocation when GPS is unavailable for drafts that need it', async () => {
    const { service } = setup({ locationValid: false });
    await service.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      position: { category: 'DASHBOARD' },
      sourceUri: 'file:///camera/shot.jpg',
    });

    await expect(service.attachLocation({ serviceId: 'svc-1', phase: 'load' })).resolves.toBe(
      false,
    );
    expect((await service.listByService('svc-1'))[0]?.coordinate).toBeNull();
  });

  it('removes a local draft and its file', async () => {
    const { service, files } = setup();
    const photo = await service.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      role: 'additional',
      position: { category: 'EXTERIOR', angle: 'links-voor' },
      sourceUri: 'file:///camera/shot.jpg',
    });

    await service.remove(photo.id);

    expect(await service.listByService('svc-1')).toEqual([]);
    expect(files.dump()[photo.filePath]).toBeUndefined();
  });

  it('prunes metadata when the photo file is gone so the overview can still load', async () => {
    const { service, files, repository } = setup();
    const keep = await service.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      position: { category: 'EXTERIOR', angle: 'rechts-voor' },
      sourceUri: 'file:///camera/shot.jpg',
    });
    const orphan = await service.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      position: { category: 'EXTERIOR', angle: 'links-voor' },
      sourceUri: 'file:///camera/shot.jpg',
    });
    await files.remove(orphan.filePath);

    const listed = await service.listByService('svc-1');

    expect(listed.map((photo) => photo.id)).toEqual([keep.id]);
    expect((await repository.load()).map((photo) => photo.id)).toEqual([keep.id]);
  });

  it('does not remove a sent photo', async () => {
    const { service, files } = setup();
    const photo = await service.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      role: 'additional',
      position: { category: 'ROOF' },
      sourceUri: 'file:///camera/shot.jpg',
    });
    await service.submitBatch('svc-1', 'load');

    await service.remove(photo.id);

    expect(await service.listByService('svc-1')).toEqual([
      expect.objectContaining({ id: photo.id, status: PHOTO_STATUS.sent }),
    ]);
    expect(files.dump()[photo.filePath]).toBeDefined();
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
    await service.submitBatch('svc-1', 'load');

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
    await service.submitBatch('svc-1', 'load');

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
    await service.submitBatch('svc-1', 'load');
    await service.capture({
      serviceId: 'svc-1',
      incidentId: 'inc-1',
      allocationId: 'alloc-1',
      phase: 'load',
      position: { category: 'DASHBOARD' },
      sourceUri: 'file:///camera/shot.jpg',
    });
    await service.submitBatch('svc-1', 'load');

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
    await service.submitBatch('svc-1', 'load');

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

function createUploadFiles() {
  const remove = vi.fn(async () => undefined);
  const files = {
    prepare: vi.fn(async () => ({
      appendTo(body: FormData, fieldName: string) {
        body.append(fieldName, 'prepared-jpeg');
      },
      remove,
    })),
  };
  return { files, remove };
}

describe('photos api multipart', () => {
  it('posts the form fields the backend expects', async () => {
    const request = vi.fn(async () => undefined);
    const http = { request, requestJson: vi.fn() } as unknown as HttpClient;
    const { files, remove } = createUploadFiles();
    const api = createPhotosApi(http, files, 'https://api.test');

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
      overrideExisting: true,
    });

    expect(request).toHaveBeenCalledWith(
      '/api/binary/upload',
      expect.objectContaining({
        method: 'POST',
        query: { content: 'photo', overrideExisting: true },
        responseType: 'none',
      }),
    );
    const call = request.mock.calls[0] as unknown as
      [string, { body?: FormData } | undefined] | undefined;
    const body = call?.[1]?.body;
    expect(body).toBeInstanceOf(FormData);
    expect(body?.get('IncidentId')).toBe('inc-1');
    expect(body?.get('ServiceId')).toBe('svc-1');
    expect(body?.get('file')).toBe('prepared-jpeg');
    expect(body?.get('Latitude')).toBe('1');
    expect(body?.get('Longitude')).toBe('2');
    expect(body?.get('Comment')).toBe('Aanvang');
    expect(body?.get('Comment  ')).toBeNull();
    expect(body?.get('CreatedDateTime')).toBe('Mon, 21 Sep 2026 12:00:00 GMT');
    expect(files.prepare).toHaveBeenCalledWith(new Uint8Array([9]), {
      name: 'a.jpg',
      type: 'image/jpeg',
    });
    expect(remove).toHaveBeenCalledOnce();
    expect(body?.get('isExtra')).toBe('true');
    expect(body?.get('overrideExisting')).toBeNull();
    expect(body?.get('ImagePosition')).toBe(
      JSON.stringify({ name: 'Buitenkant', position: 'links-voor' }),
    );
  });

  it.each([false, true])(
    'uses the file port without a byte Blob and cleans up after request failure: %s',
    async (fails) => {
      const { files, remove } = createUploadFiles();
      const error = new NetworkError();
      const http: HttpClient = {
        async request() {
          expect(remove).not.toHaveBeenCalled();
          if (fails) throw error;
          return undefined;
        },
        requestJson: vi.fn(),
        requestBytes: vi.fn(),
      };
      vi.stubGlobal(
        'Blob',
        class {
          constructor() {
            throw new Error('Unsupported byte Blob');
          }
        },
      );
      try {
        const uploading = createPhotosApi(http, files, 'https://api.test').upload({
          incidentId: 'inc-1',
          serviceId: 'svc-1',
          coordinate: { latitude: 1, longitude: 2 },
          imagePosition: { name: 'Dashboard' },
          fileName: 'photo.jpg',
          fileBytes: new Uint8Array([9]),
          comment: 'Aanvang',
          createdDateTime: 'Mon, 21 Sep 2026 12:00:00 GMT',
          isExtra: false,
        });
        if (fails) await expect(uploading).rejects.toBe(error);
        else await expect(uploading).resolves.toBeUndefined();
        expect(remove).toHaveBeenCalledOnce();
      } finally {
        vi.unstubAllGlobals();
      }
    },
  );
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
    const api = createPhotosApi(http, createUploadFiles().files, 'https://api.test');

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
