import { describe, expect, it } from 'vitest';
import {
  base64ToBytes,
  extractBase64,
  hasSignatureInk,
  isJpegBase64,
  toJpegDataUrl,
} from './image-bytes';

describe('image-bytes', () => {
  it('strips a data-url prefix', () => {
    expect(extractBase64('data:image/jpeg;base64,abc')).toBe('abc');
    expect(extractBase64('abc')).toBe('abc');
  });

  it('detects jpeg SOI in base64', () => {
    expect(isJpegBase64('/9j/xx')).toBe(true);
    expect(isJpegBase64('data:image/jpeg;base64,/9j/xx')).toBe(true);
    expect(isJpegBase64('iVBORw0KGgo')).toBe(false);
  });

  it('decodes base64 to bytes', () => {
    expect(Array.from(base64ToBytes('YQ=='))).toEqual([97]);
  });

  it('wraps raw base64 as a jpeg data url', () => {
    expect(toJpegDataUrl('/9j/xx')).toBe('data:image/jpeg;base64,/9j/xx');
    expect(toJpegDataUrl('data:image/jpeg;base64,/9j/xx')).toBe('data:image/jpeg;base64,/9j/xx');
  });

  it('requires a jpeg payload before treating an answer as ink', () => {
    expect(hasSignatureInk('data:image/jpeg;base64,/9j/xx')).toBe(true);
    expect(hasSignatureInk('Handtekening vastgelegd')).toBe(false);
    expect(hasSignatureInk('')).toBe(false);
    expect(hasSignatureInk(null)).toBe(false);
  });
});
