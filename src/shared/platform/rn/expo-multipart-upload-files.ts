import { randomUUID } from 'expo-crypto';
import { File, Paths } from 'expo-file-system';
import type { MultipartUploadFiles } from '../ports';

export function createExpoMultipartUploadFiles(): MultipartUploadFiles {
  return {
    async prepare(bytes, _metadata) {
      const file = new File(Paths.cache, `upload-${randomUUID()}`);
      try {
        file.write(bytes);
      } catch (error) {
        if (file.exists) {
          file.delete();
        }
        throw error;
      }
      return {
        appendTo(body, fieldName) {
          body.append(fieldName, file);
        },
        async remove() {
          if (file.exists) {
            file.delete();
          }
        },
      };
    },
  };
}
