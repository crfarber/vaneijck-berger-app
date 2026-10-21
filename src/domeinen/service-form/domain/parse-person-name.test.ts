import { describe, expect, it } from 'vitest';
import {
  formatPersonNamePreview,
  matchSalutationOption,
  parsePersonName,
  PERSON_SALUTATION_KEY,
} from './parse-person-name';

describe('parsePersonName', () => {
  it('returns empty parts for blank input', () => {
    expect(parsePersonName('   ')).toEqual({
      salutationKey: null,
      initials: null,
      firstName: null,
      middleName: null,
      lastName: null,
    });
  });

  it('treats a single token as last name', () => {
    expect(parsePersonName('Vries')).toEqual({
      salutationKey: null,
      initials: null,
      firstName: null,
      middleName: null,
      lastName: 'Vries',
    });
  });

  it('splits two tokens into first and last name', () => {
    expect(parsePersonName('Jan Vries')).toEqual({
      salutationKey: null,
      initials: 'J.',
      firstName: 'Jan',
      middleName: null,
      lastName: 'Vries',
    });
  });

  it('parses Dutch tussenvoegsel', () => {
    expect(parsePersonName('Jan de Vries')).toEqual({
      salutationKey: null,
      initials: 'J.',
      firstName: 'Jan',
      middleName: 'de',
      lastName: 'Vries',
    });
  });

  it('parses multi-word tussenvoegsel and leading initials', () => {
    expect(parsePersonName('A. van den Berg')).toEqual({
      salutationKey: null,
      initials: 'A.',
      firstName: null,
      middleName: 'van den',
      lastName: 'Berg',
    });
  });

  it.each([
    ['dhr CR Farber', 'C.R.', 'Farber'],
    ['Dhr C R Farber', 'C.R.', 'Farber'],
    ['De heer C. R. Färber', 'C.R.', 'Färber'],
  ])('parses spaced or unpunctuated initials in %s', (input, initials, lastName) => {
    expect(parsePersonName(input)).toEqual({
      salutationKey: PERSON_SALUTATION_KEY.deHeer,
      initials,
      firstName: null,
      middleName: null,
      lastName,
    });
  });

  it('normalizes a typographic apostrophe in a Dutch tussenvoegsel', () => {
    expect(parsePersonName('Mevr R. ’t Hooft')).toEqual({
      salutationKey: PERSON_SALUTATION_KEY.mevrouw,
      initials: 'R.',
      firstName: null,
      middleName: "'t",
      lastName: 'Hooft',
    });
  });

  it('parses salutation aliases before the name', () => {
    expect(parsePersonName('Dhr. Jan de Vries')).toEqual({
      salutationKey: PERSON_SALUTATION_KEY.deHeer,
      initials: 'J.',
      firstName: 'Jan',
      middleName: 'de',
      lastName: 'Vries',
    });
    expect(parsePersonName('Mevr. A. van den Berg').salutationKey).toBe(
      PERSON_SALUTATION_KEY.mevrouw,
    );
    expect(parsePersonName('Dr. Anna Jansen').salutationKey).toBe(PERSON_SALUTATION_KEY.doctor);
  });

  it('keeps multiple given names before a particle together', () => {
    expect(parsePersonName('Jan Piet de Vries')).toEqual({
      salutationKey: null,
      initials: 'J.P.',
      firstName: 'Jan Piet',
      middleName: 'de',
      lastName: 'Vries',
    });
  });

  it('is conservative for foreign names without a known particle', () => {
    expect(parsePersonName('Carlos García López')).toEqual({
      salutationKey: null,
      initials: 'C.',
      firstName: 'Carlos',
      middleName: null,
      lastName: 'García López',
    });
  });

  it('does not treat von/du/di as Dutch tussenvoegsel', () => {
    expect(parsePersonName('Ludwig von Beethoven')).toEqual({
      salutationKey: null,
      initials: 'L.',
      firstName: 'Ludwig',
      middleName: null,
      lastName: 'von Beethoven',
    });
  });

  it('does not force salutation when only an unknown title is present', () => {
    expect(parsePersonName('Herr Schmidt').salutationKey).toBeNull();
    expect(parsePersonName('Herr Schmidt')).toEqual({
      salutationKey: null,
      initials: 'H.',
      firstName: 'Herr',
      middleName: null,
      lastName: 'Schmidt',
    });
  });
});

describe('matchSalutationOption', () => {
  const options = [
    { label: 'De heer', value: 1 },
    { label: 'Mevrouw', value: 2 },
    { label: 'Doctor', value: 3 },
  ];

  it('maps a parsed key onto a CRM option label', () => {
    expect(matchSalutationOption(PERSON_SALUTATION_KEY.deHeer, options)).toEqual(options[0]);
    expect(matchSalutationOption(PERSON_SALUTATION_KEY.mevrouw, options)).toEqual(options[1]);
    expect(matchSalutationOption(PERSON_SALUTATION_KEY.doctor, options)).toEqual(options[2]);
  });

  it('returns null when the option set has no match', () => {
    expect(
      matchSalutationOption(PERSON_SALUTATION_KEY.doctor, [{ label: 'De heer', value: 1 }]),
    ).toBeNull();
    expect(matchSalutationOption(null, options)).toBeNull();
  });
});

describe('formatPersonNamePreview', () => {
  it('joins non-empty name parts with a middle dot and omits salutation', () => {
    expect(
      formatPersonNamePreview({
        salutationKey: PERSON_SALUTATION_KEY.deHeer,
        initials: 'J.',
        firstName: null,
        middleName: 'de',
        lastName: 'Vries',
      }),
    ).toBe('J. · de · Vries');
  });
});
