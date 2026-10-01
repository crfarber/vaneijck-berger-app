import { describe, expect, it } from 'vitest';
import { buildUploadSignatureParams, getPhaseLabel } from './signature-upload';

describe('getPhaseLabel', () => {
  it('maps known phases', () => {
    expect(getPhaseLabel(1)).toBe('Aanvang');
    expect(getPhaseLabel(2)).toBe('Aflevering');
  });

  it('rejects unknown phases', () => {
    expect(() => getPhaseLabel(9)).toThrow(/Unsupported signature phase/);
  });
});

describe('buildUploadSignatureParams', () => {
  it('picks the active signature slot and labels', () => {
    expect(
      buildUploadSignatureParams({
        incidentId: 'inc',
        serviceId: 'svc',
        signatureData: {
          phase: 1,
          signature_executor: 'data:image/jpeg;base64,/9j/',
          signature_executor_name: 'Jan',
          signature_executor_email: 'jan@example.com',
        },
      }),
    ).toEqual({
      incidentId: 'inc',
      serviceId: 'svc',
      signatureData: 'data:image/jpeg;base64,/9j/',
      name: 'Jan',
      email: 'jan@example.com',
      phase: 'Aanvang',
      signatureType: 'Berger',
    });
  });
});
