import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./service-form-screen.tsx', import.meta.url), 'utf8');

describe('service form footer', () => {
  it('keeps the form visible through the translucent footer', () => {
    expect(source).toContain('<ScreenFooter backgroundColor="rgba(255, 255, 255, 0.15)">');
    expect(source).toContain('disabled={termsAcceptanceRequired && !acceptedTermsAndConditions}');
  });
});

describe('finish form behavior', () => {
  it('shows separate legacy phases and clears their snapshot before the wrapper exit', () => {
    expect(source).toContain('SERVICE_FORM_FINISH_PHASES.map');
    expect(source).toContain('const initialExpandedSectionIds = finishMode');
    expect(source).toContain('populatedSectionIds.slice(0, 1)');
    expect(source).toContain('await drafts.clearPhaseOneSnapshot(');
    expect(source).toContain("trigger: 'finish', fromProcessingFinish: true");
  });

  it('stores phase-one answers only after a successful first-phase submit on a two-phase form', () => {
    expect(source).toContain('form.phase === SERVICE_FORM_PHASE.load');
    expect(source).toContain('phaseNumbers.includes(SERVICE_FORM_PHASE.delivery)');
    expect(source).toContain('await drafts.savePhaseOneSnapshot(');
  });
});
