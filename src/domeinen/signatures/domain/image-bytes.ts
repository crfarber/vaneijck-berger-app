/** Strip a `data:image/...;base64,` prefix when present. */
export function extractBase64(data: string): string {
  const marker = 'base64,';
  const index = data.indexOf(marker);
  return index === -1 ? data : data.slice(index + marker.length);
}

/** Decode base64 into bytes for multipart upload. */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(extractBase64(base64));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** True when the payload is already a JPEG (SOI marker). */
export function isJpegBase64(data: string): boolean {
  return extractBase64(data).trim().startsWith('/9j/');
}

/** Wrap raw or prefixed base64 as a JPEG data URL for form state and Image previews. */
export function toJpegDataUrl(rawOrDataUrl: string): string {
  return `data:image/jpeg;base64,${extractBase64(rawOrDataUrl)}`;
}

/** True when the form answer holds a JPEG signature (not merely a non-empty string). */
export function hasSignatureInk(value: unknown): boolean {
  return typeof value === 'string' && value.length > 0 && isJpegBase64(value);
}
