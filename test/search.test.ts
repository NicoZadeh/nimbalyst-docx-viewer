import { describe, it, expect } from 'vitest';
import { findMatches } from '../src/search/search';

describe('findMatches', () => {
  it('finds all non-overlapping, case-insensitive matches', () => {
    const m = findMatches('The cat sat on the CAT mat', 'cat');
    expect(m).toEqual([
      { start: 4, end: 7 },
      { start: 19, end: 22 },
    ]);
  });

  it('returns nothing for empty/whitespace queries or no match', () => {
    expect(findMatches('hello', '')).toEqual([]);
    expect(findMatches('hello', '   ')).toEqual([]);
    expect(findMatches('hello', 'zzz')).toEqual([]);
  });

  it('does not produce overlapping matches', () => {
    expect(findMatches('aaaa', 'aa')).toEqual([
      { start: 0, end: 2 },
      { start: 2, end: 4 },
    ]);
  });
});
