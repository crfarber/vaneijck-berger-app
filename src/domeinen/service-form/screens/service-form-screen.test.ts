import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./service-form-screen.tsx', import.meta.url), 'utf8');

describe('service form footer', () => {
  it('keeps the form visible through the translucent footer', () => {
    expect(source).toContain('<ScreenFooter backgroundColor="rgba(255, 255, 255, 0.15)">');
    expect(source).toContain('disabled={termsAcceptanceRequired && !acceptedTermsAndConditions}');
  });
});

describe('phase-one snapshot on submit', () => {
  it('stores phase-one answers only after a successful first-phase submit on a two-phase form', () => {
    expect(source).toContain('form.phase === SERVICE_FORM_PHASE.load');
    expect(source).toContain('phaseNumbers.includes(SERVICE_FORM_PHASE.delivery)');
    expect(source).toContain('await drafts.savePhaseOneSnapshot(');
  });
});

describe('locatie-afgifte', () => {
  it('resolves via useProcessingService, uses the clock port and clears photos after submit', () => {
    expect(source).toContain('useProcessingService');
    expect(source).toContain('useServiceFormClock');
    expect(source).toContain('applyReleaseSubmitFields');
    expect(source).toContain('clearForAllocation(exitContext.allocationId)');
    expect(source).not.toContain('systemClock');
    expect(source).not.toContain('findReleaseAssignment');
    expect(source).toContain('isReleaseItem: exitContext.isReleaseItem');
    expect(source).toContain('locationId: exitContext.locationId');
  });
});
