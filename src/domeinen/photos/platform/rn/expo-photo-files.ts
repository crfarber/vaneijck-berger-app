import { Directory, File, Paths } from 'expo-file-system';
import { CryptoDigestAlgorithm, digestStringAsync, getRandomBytes } from 'expo-crypto';
import { bytesToHex, hexToBytes } from '@noble/ciphers/utils.js';
import type { Logger } from '@/shared/logging/logger';
import type { SecretStore } from '@/shared/platform/ports';
import { openPhoto, sealPhoto } from '../../service/photo-encryption';
import type { PhotoFiles } from '../../service/photo-files';

/**
 * Stores JPEGs under the document directory so they survive until the queue clears them. Uses the
 * new `expo-file-system` File/Directory API (SDK 57).
 *
 * Display uses a decrypted JPEG cache under `Paths.cache` so the overview does not rebuild multi-MB
 * base64 data URIs on every focus.
 */
export function createExpoPhotoFiles(secretStore: SecretStore, logger?: Logger): PhotoFiles {
  const keyName = 'photos.encryptionKey';
  let pendingKey: Promise<Uint8Array> | null = null;

  function key(): Promise<Uint8Array> {
    if (pendingKey === null) {
      pendingKey = (async () => {
        const existing = await secretStore.getItem(keyName);
        if (existing !== null) {
          return hexToBytes(existing);
        }
        const generated = getRandomBytes(32);
        await secretStore.setItem(keyName, bytesToHex(generated));
        return generated;
      })().catch((error: unknown) => {
        pendingKey = null;
        throw error;
      });
    }
    return pendingKey;
  }

  function photosDir(): Directory {
    const directory = new Directory(Paths.document, 'photos');
    if (!directory.exists) {
      directory.create();
    }
    return directory;
  }

  function displayCacheDir(): Directory {
    const directory = new Directory(Paths.cache, 'photos-display');
    if (!directory.exists) {
      directory.create();
    }
    return directory;
  }

  function displayCacheFile(encryptedPath: string): File {
    const base =
      encryptedPath
        .split('/')
        .pop()
        ?.replace(/\.bin$/i, '') ?? `photo-${encryptedPath.length}`;
    return new File(displayCacheDir(), `${base}.jpg`);
  }

  function remoteRoot(): Directory {
    const directory = new Directory(Paths.document, 'photos-remote');
    if (!directory.exists) {
      directory.create();
    }
    return directory;
  }

  function safeSegment(value: string): string {
    return value.replace(/[^A-Za-z0-9-]/g, '_') || '_';
  }

  async function remoteFile(scope: string, url: string): Promise<File> {
    const directory = new Directory(remoteRoot(), safeSegment(scope));
    if (!directory.exists) {
      directory.create();
    }
    const hash = await digestStringAsync(CryptoDigestAlgorithm.SHA256, url);
    return new File(directory, `${safeSegment(scope)}-${hash}.bin`);
  }

  function deleteTree(directory: Directory): void {
    for (const entry of directory.list()) {
      if (entry instanceof Directory) {
        deleteTree(entry);
      } else {
        const cached = displayCacheFile(entry.uri);
        if (cached.exists) {
          cached.delete();
        }
      }
    }
    directory.delete();
  }

  return {
    async persist(sourceUri, photoId) {
      const source = new File(sourceUri);
      const destination = new File(photosDir(), `${photoId}.bin`);
      try {
        const encrypted = sealPhoto(
          await key(),
          getRandomBytes(12),
          new Uint8Array(await source.arrayBuffer()),
        );
        destination.write(encrypted);
        return destination.uri;
      } catch (error) {
        if (destination.exists) {
          destination.delete();
        }
        throw error;
      } finally {
        if (source.exists) {
          source.delete();
        }
      }
    },

    async readBytes(filePath) {
      const file = new File(filePath);
      if (!file.exists) {
        throw new Error(`Photo file missing: ${filePath}`);
      }
      return openPhoto(await key(), new Uint8Array(await file.arrayBuffer()));
    },

    async displayUri(filePath) {
      const cached = displayCacheFile(filePath);
      if (cached.exists) {
        return cached.uri;
      }
      const bytes = await this.readBytes(filePath);
      cached.write(bytes);
      return cached.uri;
    },

    async exists(filePath) {
      return new File(filePath).exists;
    },

    async remove(filePath) {
      try {
        const file = new File(filePath);
        if (file.exists) {
          file.delete();
        }
      } catch (error) {
        logger?.warn('photos', 'Could not delete photo file', { filePath, error });
      }
      try {
        const cached = displayCacheFile(filePath);
        if (cached.exists) {
          cached.delete();
        }
      } catch (error) {
        logger?.warn('photos', 'Could not delete photo display cache', { filePath, error });
      }
    },

    async removeLegacy() {
      for (const entry of photosDir().list()) {
        if (entry instanceof File && entry.extension.toLowerCase() === '.jpg') {
          entry.delete();
        }
      }
    },

    async clearKey() {
      await secretStore.removeItem(keyName);
      pendingKey = null;
    },

    async remoteDisplayUri(scope, url) {
      const file = await remoteFile(scope, url);
      return file.exists ? this.displayUri(file.uri) : null;
    },

    async storeRemote(scope, url, bytes) {
      const file = await remoteFile(scope, url);
      file.write(sealPhoto(await key(), getRandomBytes(12), bytes));
      return this.displayUri(file.uri);
    },

    async clearRemote(scope) {
      try {
        const target =
          scope === undefined ? remoteRoot() : new Directory(remoteRoot(), safeSegment(scope));
        if (target.exists) {
          deleteTree(target);
        }
      } catch (error) {
        logger?.warn('photos', 'Could not delete downloaded server photos', { error });
      }
    },
  };
}
