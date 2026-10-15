import { useEffect, useState } from 'react';
import { usePhotoService } from './photos-context';

/**
 * Display URIs for server photos without a local copy. A missing entry is still loading; null means
 * the photo could not be loaded.
 */
export function useServerPhotoUris(
  allocationId: string,
  urls: readonly string[],
): Readonly<Record<string, string | null>> {
  const service = usePhotoService();
  const [resolved, setResolved] = useState<Readonly<Record<string, string | null>>>({});
  const key = urls.join('\n');

  useEffect(() => {
    let active = true;
    for (const url of key === '' ? [] : key.split('\n')) {
      service.serverPhotoUri({ allocationId, url }).then(
        (uri) => {
          if (active) setResolved((current) => ({ ...current, [url]: uri }));
        },
        () => {
          if (active) setResolved((current) => ({ ...current, [url]: null }));
        },
      );
    }
    return () => {
      active = false;
    };
  }, [allocationId, key, service]);

  return resolved;
}
