import { describe, it, expect } from 'vitest';
import { nextScaleFromWheel, clampScale, isZoomWheel, MIN_SCALE, MAX_SCALE } from '../src/util/zoom';

describe('zoom', () => {
  it('zooms in on negative deltaY and out on positive', () => {
    expect(nextScaleFromWheel(-100, 1)).toBeGreaterThan(1);
    expect(nextScaleFromWheel(100, 1)).toBeLessThan(1);
  });

  it('clamps to [MIN_SCALE, MAX_SCALE]', () => {
    expect(nextScaleFromWheel(-100000, 1)).toBe(MAX_SCALE);
    expect(nextScaleFromWheel(100000, 1)).toBe(MIN_SCALE);
    expect(clampScale(10)).toBe(MAX_SCALE);
    expect(clampScale(0)).toBe(MIN_SCALE);
  });

  it('only treats ctrl/meta wheels as zoom', () => {
    expect(isZoomWheel({ ctrlKey: true, metaKey: false })).toBe(true);
    expect(isZoomWheel({ ctrlKey: false, metaKey: true })).toBe(true);
    expect(isZoomWheel({ ctrlKey: false, metaKey: false })).toBe(false);
  });
});
