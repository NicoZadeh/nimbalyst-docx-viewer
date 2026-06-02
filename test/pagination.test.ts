import { describe, it, expect } from 'vitest';
import { computePageGaps } from '../src/util/pagination';

describe('computePageGaps', () => {
  it('pushes a block that straddles a page boundary to the next page', () => {
    // page 1000, gap 24: 400 + 400 fit; the third 400 overflows -> gap before index 2.
    expect(computePageGaps([400, 400, 400], 1000, 24)).toEqual([{ beforeIndex: 2, height: 200 + 24 }]);
  });

  it('handles multiple page breaks', () => {
    expect(computePageGaps([600, 600, 600], 1000, 24)).toEqual([
      { beforeIndex: 1, height: 400 + 24 },
      { beforeIndex: 2, height: 400 + 24 },
    ]);
  });

  it('leaves a single oversized block whole (cannot split, e.g. a big table)', () => {
    expect(computePageGaps([3000], 1000, 24)).toEqual([]);
  });

  it('returns nothing for empty input or a non-positive page height', () => {
    expect(computePageGaps([], 1000)).toEqual([]);
    expect(computePageGaps([100, 200], 0)).toEqual([]);
  });
});
