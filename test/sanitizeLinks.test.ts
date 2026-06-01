// @vitest-environment happy-dom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { sanitizeLinks } from '../src/util/sanitizeLinks';

function anchor(href: string): HTMLAnchorElement {
  const a = document.createElement('a');
  a.setAttribute('href', href);
  a.textContent = 'link';
  return a;
}

function dispatchClick(el: HTMLElement): boolean {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true });
  el.dispatchEvent(event);
  return event.defaultPrevented;
}

describe('sanitizeLinks', () => {
  let root: HTMLElement;

  beforeEach(() => {
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  afterEach(() => {
    root.remove();
    delete (window as unknown as { electronAPI?: unknown }).electronAPI;
  });

  const dangerous = [
    ['javascript', "javascript:alert('xss')"],
    ['data', 'data:text/html,<script>alert(1)</script>'],
    ['vbscript', 'vbscript:msgbox(1)'],
    ['file', 'file:///etc/passwd'],
  ] as const;

  for (const [label, href] of dangerous) {
    it(`neutralizes and disables the ${label}: scheme`, () => {
      const a = anchor(href);
      root.appendChild(a);
      sanitizeLinks(root);
      expect(a.hasAttribute('href')).toBe(false);
      expect(a.getAttribute('aria-disabled')).toBe('true');
      expect(a.classList.contains('nim-link-blocked')).toBe(true);
      expect(() => dispatchClick(a)).not.toThrow();
    });
  }

  it('gives https links rel="noopener noreferrer" and routes clicks through openExternal', () => {
    const openExternal = vi.fn();
    (window as unknown as { electronAPI?: unknown }).electronAPI = { openExternal };
    const a = anchor('https://nimbalyst.com/');
    root.appendChild(a);
    sanitizeLinks(root);
    expect(a.getAttribute('rel')).toBe('noopener noreferrer');
    const prevented = dispatchClick(a);
    expect(prevented).toBe(true);
    expect(openExternal).toHaveBeenCalledTimes(1);
    expect(openExternal).toHaveBeenCalledWith('https://nimbalyst.com/');
  });

  it('does not navigate or throw when openExternal is unavailable', () => {
    delete (window as unknown as { electronAPI?: unknown }).electronAPI;
    const a = anchor('https://nimbalyst.com/');
    root.appendChild(a);
    sanitizeLinks(root);
    let prevented = false;
    expect(() => {
      prevented = dispatchClick(a);
    }).not.toThrow();
    expect(prevented).toBe(true);
  });

  it('is idempotent: repeated calls do not double-bind the click handler', () => {
    const openExternal = vi.fn();
    (window as unknown as { electronAPI?: unknown }).electronAPI = { openExternal };
    const a = anchor('https://nimbalyst.com/');
    root.appendChild(a);
    sanitizeLinks(root);
    sanitizeLinks(root);
    sanitizeLinks(root);
    dispatchClick(a);
    expect(openExternal).toHaveBeenCalledTimes(1);
  });

  it('guards anchors inserted AFTER sanitize runs (delegated listener), never navigating the frame', () => {
    const openExternal = vi.fn();
    (window as unknown as { electronAPI?: unknown }).electronAPI = { openExternal };
    sanitizeLinks(root); // binds the delegated guard before the anchors exist

    const danger = anchor("javascript:alert('late')");
    const safe = anchor('https://nimbalyst.com/late');
    root.append(danger, safe);

    expect(dispatchClick(danger)).toBe(true); // navigation prevented
    expect(dispatchClick(safe)).toBe(true);
    expect(openExternal).toHaveBeenCalledTimes(1); // only the http(s) one routed out
    expect(openExternal).toHaveBeenCalledWith('https://nimbalyst.com/late');
  });

  it('still neutralizes a dangerous anchor that forges the processed marker (idempotency is in-memory)', () => {
    const a = anchor("javascript:alert('forged')");
    a.setAttribute('data-nim-link-processed', 'true'); // attacker-supplied marker must not skip neutralization
    root.appendChild(a);
    sanitizeLinks(root);
    expect(a.hasAttribute('href')).toBe(false);
    expect(a.classList.contains('nim-link-blocked')).toBe(true);
  });
});
