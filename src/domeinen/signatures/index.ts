export { createSignaturesApi } from './api/signatures-api';
export type { SignaturesApi, UploadSignatureInput } from './api/signatures-api';
export {
  base64ToBytes,
  extractBase64,
  hasSignatureInk,
  isJpegBase64,
  toJpegDataUrl,
} from './domain/image-bytes';
