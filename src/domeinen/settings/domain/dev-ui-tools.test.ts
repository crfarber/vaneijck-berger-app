import { describe, expect, it } from 'vitest';
import { parseDevUiToolsEnabled, serializeDevUiToolsEnabled } from './dev-ui-tools';

describe('parseDevUiToolsEnabled', () => {
  it('is off when nothing is stored', () => {
    expect(parseDevUiToolsEnabled(null)).toBe(false);
  });

  it('is on only for the exact true token', () => {
    expect(parseDevUiToolsEnabled('true')).toBe(true);
    expect(parseDevUiToolsEnabled('false')).toBe(false);
    expect(parseDevUiToolsEnabled('1')).toBe(false);
    expect(parseDevUiToolsEnabled('TRUE')).toBe(false);
    expect(parseDevUiToolsEnabled('')).toBe(false);
  });
});

describe('serializeDevUiToolsEnabled', () => {
  it('round-trips through parse', () => {
    expect(parseDevUiToolsEnabled(serializeDevUiToolsEnabled(true))).toBe(true);
    expect(parseDevUiToolsEnabled(serializeDevUiToolsEnabled(false))).toBe(false);
  });
});
