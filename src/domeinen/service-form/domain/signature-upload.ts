/**
 * Pure helpers that turn form signature answers into the multipart upload fields.
 * Lives in service-form (owns SignatureDataInput); the HTTP client is the reusable
 * `signatures` domain.
 */

import {
  hasAnySignature,
  isSignatureKey,
  SIGNATURE_KEYS,
  type SignatureDataInput,
  type SignatureKey,
} from './signature';

export const SIGNATURE_PHASE_LABELS = {
  1: 'Aanvang',
  2: 'Aflevering',
  3: 'Afgifte',
} as const;

export type SignaturePhaseLabel =
  (typeof SIGNATURE_PHASE_LABELS)[keyof typeof SIGNATURE_PHASE_LABELS];

export const SIGNATURE_TYPE_LABELS: Readonly<Record<SignatureKey, string>> = {
  signature_sender: 'Afzender',
  signature_executor: 'Berger',
  signature_receiver: 'Geadresseerde',
  signature_tower: 'Berger',
  signature_addressee: 'Geadresseerde',
};

export type UploadSignatureParams = {
  incidentId: string;
  serviceId: string;
  signatureData: string;
  name: string;
  email: string;
  phase: SignaturePhaseLabel;
  signatureType: string;
};

export function getPhaseLabel(phase: number): SignaturePhaseLabel {
  const label = SIGNATURE_PHASE_LABELS[phase as keyof typeof SIGNATURE_PHASE_LABELS];
  if (!label) {
    throw new Error(`Unsupported signature phase: ${phase}`);
  }
  return label;
}

export function getActiveSignatureKey(signatureData: SignatureDataInput): SignatureKey {
  const activeKey = SIGNATURE_KEYS.find((key) => Boolean(signatureData[key]));
  if (!activeKey || !isSignatureKey(activeKey)) {
    throw new Error('No active signature found');
  }
  return activeKey;
}

export function buildUploadSignatureParams(input: {
  incidentId: string;
  serviceId: string;
  signatureData: SignatureDataInput;
}): UploadSignatureParams {
  if (!hasAnySignature(input.signatureData)) {
    throw new Error('No active signature found');
  }
  const activeSignatureKey = getActiveSignatureKey(input.signatureData);
  const signatureValue = input.signatureData[activeSignatureKey];
  const signatureName = input.signatureData[`${activeSignatureKey}_name`];
  const signatureEmail = input.signatureData[`${activeSignatureKey}_email`];

  if (!signatureValue) {
    throw new Error(`Missing signatureData for ${activeSignatureKey}`);
  }
  if (!signatureName) {
    throw new Error(`Missing signature name for ${activeSignatureKey}`);
  }

  return {
    incidentId: input.incidentId,
    serviceId: input.serviceId,
    signatureData: signatureValue,
    name: signatureName,
    email: signatureEmail ?? '',
    phase: getPhaseLabel(input.signatureData.phase),
    signatureType: SIGNATURE_TYPE_LABELS[activeSignatureKey],
  };
}
