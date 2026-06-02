# Changelog

All notable changes to the DOCX Viewer extension are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and the project uses [semantic versioning](https://semver.org/).

## [2.0.0] - 2026-06-02

A large interaction + extraction release. The viewer stays strictly read-only — the source `.docx`
is never modified; everything that "writes" produces a separate downloaded file.

### Added
- **Annotations** — select text to highlight (yellow / green / pink / blue) and attach a comment.
  Persisted per file. Click a highlight to view, edit, or delete its comment.
- **In-document find** (Cmd/Ctrl+F) with match highlighting and next/prev.
- **Outline / table-of-contents sidebar** built from the document's headings; click to jump.
  Resizable (drag the right edge).
- **Trackpad / Ctrl-wheel zoom** (continuous), in addition to the zoom buttons and Cmd/Ctrl +/-/0.
- **Visual page-break lines** at each page boundary (toggle in the ⋯ menu).
- **Copy as Markdown** of the whole document.
- **Export comments to Word** — downloads a new `.docx` with your annotations as real Word
  comments (the original is untouched; existing comments are preserved).
- **Show Word comments & changes** toggle — render the document's own comments and tracked changes
  (read-only; off by default).
- **Send to the assistant** — push a selection or comment into the Nimbalyst chat as context.
- **Four new AI tools**: `docx.get_outline`, `docx.get_metadata`, `docx.get_selection`,
  `docx.get_annotations` (joining `docx.get_text` from v1).
- A "⋯" overflow menu, button icons, and confirmation notices on actions.

### Changed
- Annotation updates are optimistic (instant UI; persistence in the background).
- Highlights paint via a `getClientRects` overlay so they stay aligned at any zoom.

### Notes
- `docx-preview` does not compute Word pagination; page-break lines are drawn at saved page-size
  intervals, and a single block taller than a page (e.g. a large table) is not split.
- Metadata's saved page count is reported as approximate.

## [1.0.0] - 2026-06-01

### Added
- Read-only, security-hardened rendering of `.docx` via `docx-preview` with continuous scroll.
- Zoom in/out/reset, fit-to-width, and Cmd/Ctrl +/-/0 shortcuts.
- Safe hyperlink handling: `javascript:`/`data:`/`vbscript:`/`file:` neutralized; `http(s)` routed
  through `window.electronAPI.openExternal`; the editor frame never navigates.
- The `docx.get_text` AI tool exposing the document's plain text to the assistant.
- A byteLength guard before extraction and a best-effort timeout; size policy documented.
