import { HttpError } from '@/shared/api/errors';
import type { HttpClient } from '@/shared/api/http-client';

export type UploadSignatureInput = {
  incidentId: string;
  serviceId: string;
  name: string;
  email: string;
  phase: string;
  signatureType: string;
  fileBytes: Uint8Array;
  fileName?: string;
};

export type SignaturesApi = {
  /**
   * `POST /api/signatures` multipart. A 409 (already processed) is treated as success so a
   * retry after a lost response does not fail the form submit.
   */
  upload(input: UploadSignatureInput): Promise<void>;
};

/**
 * Reusable signature upload client — same multipart style as photos. Image encoding (PNG→JPEG)
 * stays behind a platform adapter; this only sends JPEG bytes.
 */
export function createSignaturesApi(http: HttpClient): SignaturesApi {
  return {
    async upload(input) {
      const body = new FormData();
      body.append('incidentId', input.incidentId);
      body.append('serviceId', input.serviceId);
      body.append('fileExtension', '.jpg');
      body.append('name', input.name);
      body.append('email', input.email);
      body.append('phase', input.phase);
      body.append('signatureType', input.signatureType);
      body.append(
        'file',
        new Blob([input.fileBytes as BlobPart], { type: 'image/jpeg' }),
        input.fileName ?? 'signature.jpg',
      );

      try {
        await http.request('/api/signatures', {
          method: 'POST',
          body,
          responseType: 'none',
          timeoutMs: 120_000,
        });
      } catch (error) {
        if (error instanceof HttpError && error.status === 409) {
          return;
        }
        throw error;
      }
    },
  };
}
