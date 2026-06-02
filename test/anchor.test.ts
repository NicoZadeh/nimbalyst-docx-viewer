import { describe, it, expect } from 'vitest';
import { serializeAnchor, resolveAnchor } from '../src/annotations/anchor';

const TEXT = 'The quick brown fox jumps over the lazy dog. The quick brown cat sleeps.';

describe('text-quote anchor', () => {
  it('round-trips a unique selection', () => {
    const start = TEXT.indexOf('jumps');
    const end = start + 'jumps'.length;
    const anchor = serializeAnchor(TEXT, start, end);
    expect(anchor.exact).toBe('jumps');
    expect(resolveAnchor(TEXT, anchor)).toEqual({ start, end });
  });

  it('disambiguates duplicate quotes by surrounding context', () => {
    // "quick brown" appears twice; anchor the second (before "cat").
    const second = TEXT.lastIndexOf('quick brown');
    const anchor = serializeAnchor(TEXT, second, second + 'quick brown'.length);
    const resolved = resolveAnchor(TEXT, anchor);
    expect(resolved).toEqual({ start: second, end: second + 'quick brown'.length });
    // And the first one resolves to the first occurrence.
    const first = TEXT.indexOf('quick brown');
    const anchor1 = serializeAnchor(TEXT, first, first + 'quick brown'.length);
    expect(resolveAnchor(TEXT, anchor1)).toEqual({ start: first, end: first + 'quick brown'.length });
  });

  it('returns null when the quote is gone (degrade, never mis-place)', () => {
    const anchor = serializeAnchor(TEXT, 0, 3);
    expect(resolveAnchor('completely different content', anchor)).toBeNull();
    expect(resolveAnchor('xxx', { exact: '', prefix: '', suffix: '', startHint: 0 })).toBeNull();
  });
});
