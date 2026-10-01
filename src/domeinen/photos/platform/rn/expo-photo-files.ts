import { Directory, File, Paths } from 'expo-file-system';
import { getRandomBytes } from 'expo-crypto';
import { fromByteArray } from 'base64-js';
import { bytesToHex, hexToBytes } from '@noble/ciphers/utils.js';
import type { Logger } from '@/shared/logging/logger';
import type { SecretStore } from '@/shared/platform/ports';
import { openPhoto, sealPhoto } from '../../service/photo-encryption';
import type { PhotoFiles } from '../../service/photo-files';

/**
 * Stores JPEGs under the document directory so they survive until the queue clears them. Uses the
 * new `expo-file-system` File/Directory API (SDK 57).
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
      return `data:image/jpeg;base64,${fromByteArray(await this.readBytes(filePath))}`;
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
  };
}
