import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const source = readFileSync(new URL('./service-finish-screen.tsx', import.meta.url), 'utf8');

describe('service finish screen', () => {
  it('shows separate legacy phases and clears their snapshot before the wrapper exit', () => {
    expect(source).toContain('SERVICE_FORM_FINISH_PHASES.map');
    expect(source).toContain('populatedSectionIds');
    expect(source).toContain('await drafts.clearPhaseOneSnapshot(');
    expect(source).toContain("trigger: 'finish'");
    expect(source).toContain('fromProcessingFinish: true');
  });

  it('blocks the Android hardware back button so the only exit is finish', () => {
    expect(source).toContain("BackHandler.addEventListener('hardwareBackPress'");
    expect(source).toMatch(/hardwareBackPress['"],\s*\(\)\s*=>\s*true/);
  });

  it('renders every populated section expanded and read-only', () => {
    expect(source).toContain('initialExpandedSectionIds={populatedSectionIds}');
    expect(source).toContain('readOnly');
  });
});
