import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import type { Photo } from '../index';
import { usePhotoService } from './photos-context';

export type DisplayPhoto = Photo & { displayUri: string };

/** Photos of one service, refreshed after each capture or retry. */
export function useServicePhotos(serviceId: string) {
  const service = usePhotoService();
  const [photos, setPhotos] = useState<DisplayPhoto[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadDisplayPhotos = useCallback(async (): Promise<DisplayPhoto[]> => {
    const listed = await service.listByService(serviceId);
    const settled = await Promise.all(
      listed.map(async (photo) => {
        try {
          const displayUri = await service.displayUri(photo.filePath);
          return { ...photo, displayUri } satisfies DisplayPhoto;
        } catch {
          // One undecodable file must not wipe the whole overview (remaining tiles stay visible).
          return null;
        }
      }),
    );
    return settled.filter((photo): photo is DisplayPhoto => photo !== null);
  }, [service, serviceId]);

  const refresh = useCallback(async () => {
    const loaded = await loadDisplayPhotos();
    setPhotos(loaded);
    setLoaded(true);
    setLoadFailed(false);
  }, [loadDisplayPhotos]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void loadDisplayPhotos()
        .then((loadedPhotos) => {
          if (!cancelled) {
            setPhotos(loadedPhotos);
            setLoaded(true);
            setLoadFailed(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setPhotos([]);
            setLoaded(false);
            setLoadFailed(true);
          }
        });
      return () => {
        cancelled = true;
      };
    }, [loadDisplayPhotos]),
  );

  return {
    photos,
    loaded,
    loadFailed,
    busy,
    refresh,
    async capture(input: Omit<Parameters<typeof service.capture>[0], 'serviceId'>): Promise<Photo> {
      setBusy(true);
      try {
        const photo = await service.capture({ ...input, serviceId });
        await refresh();
        return photo;
      } finally {
        setBusy(false);
      }
    },
    async submitBatch(phase: Parameters<typeof service.submitBatch>[1]): Promise<void> {
      setBusy(true);
      try {
        await service.submitBatch(serviceId, phase);
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    async submitOverride(photoId: string): Promise<void> {
      setBusy(true);
      try {
        await service.submitOverride(photoId);
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    async retry(photoId: string): Promise<void> {
      setBusy(true);
      try {
        await service.retry(photoId);
        await refresh();
      } finally {
        setBusy(false);
      }
    },
    async remove(photoId: string): Promise<void> {
      setBusy(true);
      try {
        await service.remove(photoId);
        await refresh();
      } finally {
        setBusy(false);
      }
    },
  };
}
