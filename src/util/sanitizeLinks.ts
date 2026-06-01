/**
 * Neutralize hyperlinks in rendered docx output.
 *
 * DOCX is untrusted input. The security boundary is a single delegated click listener on the
 * render container: it preventDefault()s EVERY anchor click (so the editor frame can never
 * navigate) and only routes http(s) URLs to window.electronAPI.openExternal. Because the guard
 * lives on the container, it holds for anchors that appear after this runs and does not depend
 * on per-anchor processing or on any attribute that document content could forge.
 *
 * A second per-anchor pass is cosmetic + advisory: javascript:/data:/vbscript:/file: anchors get
 * their href stripped and are visibly marked disabled; http(s) anchors get rel="noopener
 * noreferrer". Idempotency uses an in-memory WeakSet (which DOCX content cannot spoof), so
 * repeated calls and re-renders never double-process or corrupt state.
 */

const CONTAINER_BOUND_ATTR = 'data-nim-links-bound';
const DANGEROUS_SCHEMES = ['javascript:', 'data:', 'vbscript:', 'file:'];

const processedAnchors = new WeakSet<HTMLAnchorElement>();

interface ElectronApiLike {
  openExternal?: (url: string) => void;
}

function getOpenExternal(): ((url: string) => void) | undefined {
  const api = (window as unknown as { electronAPI?: ElectronApiLike }).electronAPI;
  if (api && typeof api.openExternal === 'function') {
    return api.openExternal.bind(api);
  }
  return undefined;
}

function schemeOf(href: string): string {
  const match = /^([a-z][a-z0-9+.-]*:)/i.exec(href.trim());
  return match ? match[1].toLowerCase() : '';
}

export function sanitizeLinks(root: HTMLElement): void {
  // 1) The security boundary: one delegated click guard on the container, bound once.
  if (root.getAttribute(CONTAINER_BOUND_ATTR) !== 'true') {
    root.setAttribute(CONTAINER_BOUND_ATTR, 'true');
    root.addEventListener('click', (event) => {
      const anchor = (event.target as Element | null)?.closest('a');
      if (!anchor || !root.contains(anchor)) return;
      // The frame must never navigate, regardless of scheme or whether the anchor was processed.
      event.preventDefault();
      const url = anchor.getAttribute('href') ?? '';
      const scheme = schemeOf(url);
      if (scheme === 'http:' || scheme === 'https:') {
        getOpenExternal()?.(url);
      }
      // Dangerous / other schemes: no-op (navigation already prevented).
    });
  }

  // 2) Cosmetic + advisory per-anchor pass; idempotent via an unforgeable WeakSet.
  root.querySelectorAll('a').forEach((anchor) => {
    if (processedAnchors.has(anchor)) return;
    processedAnchors.add(anchor);

    const scheme = schemeOf(anchor.getAttribute('href') ?? '');
    if (DANGEROUS_SCHEMES.includes(scheme)) {
      anchor.removeAttribute('href');
      anchor.setAttribute('aria-disabled', 'true');
      anchor.setAttribute('data-nim-link-blocked', 'true');
      anchor.classList.add('nim-link-blocked');
      anchor.title = 'Link blocked for security';
    } else if (scheme === 'http:' || scheme === 'https:') {
      anchor.setAttribute('rel', 'noopener noreferrer');
    }
  });
}
