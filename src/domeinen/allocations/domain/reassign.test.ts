import { describe, expect, it } from 'vitest';
import { filterColleagues } from './reassign';
import type { Colleague } from './types';

const colleagues: Colleague[] = [
  { id: '1', workerId: 'w1', name: 'Jan de Vries' },
  { id: '2', workerId: 'w2', name: 'Piet Bakker' },
  { id: '3', workerId: 'w3', name: 'Anne Jansen' },
];

describe('filterColleagues', () => {
  it('returns everyone for an empty search', () => {
    expect(filterColleagues(colleagues, '')).toHaveLength(3);
    expect(filterColleagues(colleagues, '   ')).toHaveLength(3);
  });

  it('matches case-insensitively, anywhere in the name', () => {
    expect(filterColleagues(colleagues, 'jan').map((c) => c.id)).toEqual(['1', '3']);
    expect(filterColleagues(colleagues, 'BAKKER').map((c) => c.id)).toEqual(['2']);
  });

  it('returns nothing when no name matches', () => {
    expect(filterColleagues(colleagues, 'zzz')).toEqual([]);
  });
});
