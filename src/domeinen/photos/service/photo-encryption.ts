import { gcm } from '@noble/ciphers/aes.js';

const NONCE_LENGTH = 12;
const TAG_LENGTH = 16;

export function sealPhoto(key: Uint8Array, nonce: Uint8Array, jpeg: Uint8Array): Uint8Array {
  if (key.length !== 32 || nonce.length !== NONCE_LENGTH) {
    throw new Error('Invalid photo encryption key or nonce');
  }
  const ciphertext = gcm(key, nonce).encrypt(jpeg);
  const sealed = new Uint8Array(NONCE_LENGTH + ciphertext.length);
  sealed.set(nonce);
  sealed.set(ciphertext, NONCE_LENGTH);
  return sealed;
}

export function openPhoto(key: Uint8Array, sealed: Uint8Array): Uint8Array {
  if (key.length !== 32 || sealed.length < NONCE_LENGTH + TAG_LENGTH) {
    throw new Error('Invalid encrypted photo');
  }
  return gcm(key, sealed.slice(0, NONCE_LENGTH)).decrypt(sealed.slice(NONCE_LENGTH));
}
