# DOCX Viewer

A Nimbalyst extension that renders Word `.docx` documents inline (read-only), lets you annotate
and search them, and exposes their content to the assistant. The source `.docx` is never modified.

## Features (v2.0.0)

Viewing
- Faithful read-only rendering via [docx-preview](https://github.com/VolodymyrBaydalka/docxjs), continuous scroll.
- Zoom in/out/reset, fit-to-width, and **trackpad pinch / Ctrl+wheel** zoom. Shortcuts: Cmd/Ctrl `+`/`-`/`0`.
- Page navigation across rendered pages, labeled "Page x / N (approx.)" (docx-preview has no true Word pagination).
- Per-file view state (zoom, fit, scroll position) is remembered.
- Optional toggle to show the document's own Word comments and tracked changes (read-only).

Annotate
- Select text to highlight (yellow/green/pink/blue) and attach a comment. Highlights are painted
  as a `getClientRects` overlay, so they stay aligned at any zoom.
- Annotations persist per file (global `host.storage`, keyed by absolute path) via a text-quote
  anchor that re-locates the quote after re-render; if a quote can no longer be found it is marked
  "unanchored" rather than mis-placed.
- A comments panel lists annotations with jump / edit / delete and export to Markdown or JSON.

Search & navigation
- In-document find (Cmd/Ctrl+F) with match highlighting and next/prev.
- Outline / TOC sidebar built from the document's headings.

Send to the assistant
- Copy a selection or a comment, or **send it to the chat** as context (`host.setEditorContext`).
- Copy the whole document as Markdown.

AI tools (all `scope: 'editor'`, `*.docx`)
- `docx.get_text` — full plain text.
- `docx.get_outline` — heading hierarchy.
- `docx.get_metadata` — title/author/dates/word+char counts/approximate saved page count.
- `docx.get_selection` — the current selection (only when the doc is open and focused).
- `docx.get_annotations` — your highlights + comments.

Export
- Export a NEW `.docx` (downloaded; the original is untouched) with your annotations written as real
  Word comments. Anchoring is at paragraph granularity; comments that cannot be located are
  reported and skipped, and existing comments in the source are preserved.

## Security

- docx-preview is hardened: `renderAltChunks` off always; `renderComments`/`renderChanges` are off
  by default and only enabled by the explicit read-only "Word marks" toggle (which re-runs the
  generation-token render and re-sanitizes links).
- Links are neutralized by a single delegated click guard: every anchor click is `preventDefault`-ed
  so the frame never navigates, only `http(s)` is routed to `window.electronAPI.openExternal`, and
  `javascript:`/`data:`/`vbscript:`/`file:` are stripped and marked disabled.
- Extraction uses Mammoth; the annotated-`.docx` export escapes comment text and strips
  XML-1.0-illegal control characters. No source file is ever mutated in place.

## Size & timeout policy

- Soft limit roughly 25 MB; hard limit 50 MB render / 25 MB extraction.
- The `byteLength` guard (before Mammoth/jszip) is the real safeguard; the ~20s extraction timeout
  is BEST EFFORT only (a CPU-bound parse on the main thread blocks the timer).
- The initial host binary load cannot be preflighted (no host stat API), so very large hidden
  documents remain best effort. `savedPageCount` from metadata is reported as approximate.

## Install locally in Nimbalyst (dev)

Requires Nimbalyst app >= 0.58.5.

1. `npm ci`
2. `npm run build`
3. Install the local folder via Extension Dev Tools (the `extension_install` flow), or install the
   packaged `build/docx-viewer-2.0.0.nimext`.
4. Iterate with `extension_build`, `extension_install`, `extension_reload`. A reload (or app
   restart) re-runs extension discovery.

## Manual test checklist

1. Open `samples/demo.docx`. Confirm it renders; zoom buttons, **trackpad pinch / Ctrl+wheel**,
   fit-width, and Cmd/Ctrl `+`/`-`/`0` all work; the page count shows.
2. Select a sentence: the floating toolbar appears. Highlight it, add a comment, open the Comments
   panel, edit/delete, and try "Copy" and "Send to AI". Reopen the file and confirm the annotation
   and your zoom/scroll persist.
3. Press Cmd/Ctrl+F and search; matches highlight and next/prev navigate. Open the Outline panel and
   click a heading to jump.
4. Ask the assistant to summarize a `.docx` that is NOT open in a tab (exercises the hidden-mount
   path and `docx.get_text`). Ask it for the outline/metadata to exercise those tools.
5. Security smoke with `samples/demo-links.docx`: the `https` link opens via `openExternal`, the
   `javascript:` link is struck through and inert. Toggle "Word marks" to show the doc's own comment
   and tracked change; toggle off to hide them again.
6. "Copy MD" copies Markdown. With at least one annotation, "Export comments" downloads
   `<name>-commented.docx`; open it in Word and confirm the comment is present and the original
   comment (in demo-links) is preserved.
7. Large-image memory with `samples/demo-images.docx`: note renderer memory with `useBase64URL`.

## Build & test

- `npm run build` · `npm test` · `npm run typecheck` · `npm run package` (needs the `zip` CLI).
- 61 automated tests cover the logic, extraction, OOXML write-back, AI-tool handlers, link
  sanitization, and DOM offset mapping. The live rendering, highlight/overlay painting, trackpad
  events, and chat round-trip are runtime paths verified manually (their logic is unit-tested).
- Fixtures/samples are generated by `python3 scripts/make-fixtures.py` (PIL required for the image).

## Distribution

A GitHub Release `.nimext` asset is produced by `.github/workflows/release.yml` on `v*` tags. `dist/`
is not committed.

## Notable implementation choices / deviations

- Highlights/search paint via a `getClientRects` DOM overlay (not the CSS Custom Highlight API),
  which stays aligned under the CSS `zoom` used for scaling.
- Annotations are a viewer-side overlay in `host.storage`; the original `.docx` is never edited.
  "Export comments" produces a separate downloaded file.
- A shared Mammoth input helper selects `{ buffer }` (Node) vs `{ arrayBuffer }` (renderer).
- Metadata XML is parsed with a small dependency-free extractor; only `jszip` was added as a dep.
- `package.json` uses `"type": "module"`; `ignoreLastRenderedPageBreak: false` is set explicitly.
- `docx.get_selection` returns data only when the document is the open, focused editor.
