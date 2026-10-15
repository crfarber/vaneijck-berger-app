/**
 * Durable storage for photo bytes on the device. Metadata lives in `KeyValueStore`; this port only
 * holds the JPEG itself so a failed upload never loses the file.
 */
export type PhotoFiles = {
  /** Copies a camera capture into app storage. Returns the stored absolute path. */
  persist(sourceUri: string, photoId: string): Promise<string>;
  /** Bytes for the multipart body. */
  readBytes(filePath: string): Promise<Uint8Array>;
  /**
   * URI suitable for `<Image source={{ uri }}>`. Prefer a short `file://` cache path over a giant
   * base64 data URI so the overview can load many tiles quickly.
   */
  displayUri(filePath: string): Promise<string>;
  /** False when the stored file was wiped (reinstall, container move, manual delete). */
  exists(filePath: string): Promise<boolean>;
  remove(filePath: string): Promise<void>;
  removeLegacy(): Promise<void>;
  clearKey(): Promise<void>;
  /** Display URI of a downloaded server photo of one allocation, or null when not stored yet. */
  remoteDisplayUri(scope: string, url: string): Promise<string | null>;
  /** Stores a downloaded server photo encrypted and returns its display URI. */
  storeRemote(scope: string, url: string, bytes: Uint8Array): Promise<string>;
  /** Removes downloaded server photos of one allocation, or all of them without a scope. */
  clearRemote(scope?: string): Promise<void>;
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
    async exists(filePath) {
      return files.has(filePath);
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
    async remoteDisplayUri(scope, url) {
      const path = `/remote/${scope}/${encodeURIComponent(url)}`;
      return files.has(path) ? path : null;
    },
    async storeRemote(scope, url, bytes) {
      const path = `/remote/${scope}/${encodeURIComponent(url)}`;
      files.set(path, bytes);
      return path;
    },
    async clearRemote(scope) {
      const prefix = scope === undefined ? '/remote/' : `/remote/${scope}/`;
      for (const path of [...files.keys()]) {
        if (path.startsWith(prefix)) {
          files.delete(path);
        }
      }
    },
    dump: () => Object.fromEntries(files),
  };
}
