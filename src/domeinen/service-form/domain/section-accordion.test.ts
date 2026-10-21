import { describe, expect, it } from 'vitest';
import { expandAccordionSection, toggleAccordionSection } from './section-accordion';

describe('section accordion', () => {
  it('opens a closed section alone and closes others', () => {
    expect(toggleAccordionSection({ 'section-1': true }, 'section-2')).toEqual({
      'section-2': true,
    });
  });

  it('closes the open section when toggled again', () => {
    expect(toggleAccordionSection({ 'section-1': true }, 'section-1')).toEqual({});
  });

  it('expands one section exclusively', () => {
    expect(expandAccordionSection('section-3')).toEqual({ 'section-3': true });
  });
});
