/**
 * The 5 fixed signature slots a service form can have, ported from `utils/{types,signature}.ts`.
 * Only the pure key/shape helpers are taken over — uploading a captured signature is its own,
 * not-yet-built capability (see `ServiceFormCapabilities.captureSignature`).
 */
export type SignatureKey =
  | 'signature_sender'
  | 'signature_executor'
  | 'signature_receiver'
  | 'signature_tower'
  | 'signature_addressee';

export type SignatureDataInput = {
  phase: number;
  signature_sender?: string;
  signature_sender_name?: string;
  signature_sender_email?: string;
  signature_executor?: string;
  signature_executor_name?: string;
  signature_executor_email?: string;
  signature_receiver?: string;
  signature_receiver_name?: string;
  signature_receiver_email?: string;
  signature_tower?: string;
  signature_tower_name?: string;
  signature_tower_email?: string;
  signature_addressee?: string;
  signature_addressee_name?: string;
  signature_addressee_email?: string;
};

export const SIGNATURE_KEYS: readonly SignatureKey[] = [
  'signature_sender',
  'signature_executor',
  'signature_receiver',
  'signature_tower',
  'signature_addressee',
];

export function isSignatureKey(key: string): key is SignatureKey {
  return (SIGNATURE_KEYS as readonly string[]).includes(key);
}

export function hasAnySignature(signatureData: SignatureDataInput): boolean {
  return SIGNATURE_KEYS.some((key) => Boolean(signatureData[key]));
}
