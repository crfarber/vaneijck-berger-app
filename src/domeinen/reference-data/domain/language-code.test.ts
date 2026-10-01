import { describe, expect, it } from 'vitest';
import { languageCodeFor } from './language-code';

describe('languageCodeFor', () => {
  it('maps Dutch to 1043 (nl-NL), as the old app always sent', () => {
    expect(languageCodeFor('nl')).toBe(1043);
  });

  it('maps English to 1043 as well: the old app never varied, and 1033 500s on tst', () => {
    expect(languageCodeFor('en')).toBe(1043);
  });
});
