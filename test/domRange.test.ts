// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import { offsetOf, locateOffset } from '../src/annotations/domRange';

describe('domRange offset mapping', () => {
  it('maps character offsets to text nodes across nested elements and back', () => {
    const root = document.createElement('div');
    root.innerHTML = '<p>Hello <strong>brave</strong> world</p><p>second</p>';
    expect(root.textContent).toBe('Hello brave worldsecond');

    // Offset 8 lands inside "brave" ("Hello " is 0..6, "brave" is 6..11).
    const inBrave = locateOffset(root, 8);
    expect(inBrave?.node.data).toBe('brave');
    expect(inBrave?.offset).toBe(2);
    expect(offsetOf(root, inBrave!.node, inBrave!.offset)).toBe(8);

    const atEnd = locateOffset(root, 23);
    expect(atEnd?.node.data).toBe('second');
    expect(atEnd?.offset).toBe(6);
  });

  it('returns null for an empty root', () => {
    const root = document.createElement('div');
    expect(locateOffset(root, 0)).toBeNull();
  });
});
