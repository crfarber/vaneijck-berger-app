import { describe, expect, it } from 'vitest';
import {
  scrollOffsetBelowSectionHeader,
  serviceFormStickyHeaderIndices,
  serviceFormStickySectionId,
} from './section-scroll';

describe('serviceFormStickyHeaderIndices', () => {
  it('sticks each section header and skips the body that follows an open section', () => {
    expect(serviceFormStickyHeaderIndices([true, false, true], 1)).toEqual([1, 3, 4]);
  });

  it('shifts header indices when content sits above the first section', () => {
    expect(serviceFormStickyHeaderIndices([true, true], 2)).toEqual([2, 4]);
  });

  it('returns no indices when there are no sections', () => {
    expect(serviceFormStickyHeaderIndices([], 1)).toEqual([]);
  });
});

describe('scrollOffsetBelowSectionHeader', () => {
  it('places the field just under the sticky header', () => {
    expect(scrollOffsetBelowSectionHeader(200, 60)).toBe(140);
  });

  it('does not scroll above the start of the form', () => {
    expect(scrollOffsetBelowSectionHeader(40, 60)).toBe(0);
  });
});

describe('serviceFormStickySectionId', () => {
  it('returns only the section whose header has reached the scroll top', () => {
    const offsets = new Map([
      ['first', 24],
      ['second', 200],
    ]);

    expect(serviceFormStickySectionId(['first', 'second'], offsets, 23)).toBeNull();
    expect(serviceFormStickySectionId(['first', 'second'], offsets, 24)).toBe('first');
    expect(serviceFormStickySectionId(['first', 'second'], offsets, 200)).toBe('second');
  });
});
