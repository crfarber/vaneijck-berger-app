/**
 * Durable storage for photo bytes on the device. Metadata lives in `KeyValueStore`; this port only
 * holds the JPEG itself so a failed upload never loses the file.
 */
export type PhotoFiles = {
  /** Copies a camera capture into app storage. Returns the stored absolute path. */
  persist(sourceUri: string, photoId: string): Promise<string>;
  /** Bytes for the multipart body. */
  readBytes(filePath: string): Promise<Uint8Array>;
  displayUri(filePath: string): Promise<string>;
  remove(filePath: string): Promise<void>;
  removeLegacy(): Promise<void>;
  clearKey(): Promise<void>;
};

/** In-memory stand-in for tests. `persist` copies from `seed` when the uri matches a key. */
export function createInMemoryPhotoFiles(
  seed: Record<string, Uint8Array> = {},
): PhotoFiles & { dump(): Record<string, Uint8Array> } {
  const files = new Map<string, Uint8Array>(Object.entries(seed));
  return {
    async persist(sourceUri, photoId) {
      const bytes = files.get(sourceUri) ?? new Uint8Array([0xff, 0xd8, 0xff]);
      const path = `/photos/${photoId}.bin`;
      files.set(path, bytes);
      return path;
    },
    async readBytes(filePath) {
      const bytes = files.get(filePath);
      if (!bytes) {
        throw new Error(`Photo file missing: ${filePath}`);
      }
      return bytes;
    },
    async displayUri(filePath) {
      return filePath;
    },
    async remove(filePath) {
      files.delete(filePath);
    },
    async removeLegacy() {
      for (const path of files.keys()) {
        if (path.startsWith('/photos/') && path.endsWith('.jpg')) {
          files.delete(path);
        }
      }
    },
    async clearKey() {},
    dump: () => Object.fromEntries(files),
  };
}
