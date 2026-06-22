# UI/UX Improvements — Design Spec

> **Date:** 2026-06-22
> **Scope:** Fix 12 UI/UX disadvantages in Smart PDF Lecture Summarizer
> **Approach:** Incremental patches — each fix is independently testable

---

## 1. Toast Notification System

**Problem:** Errors use `alert()` (file validation) or inline `#err-box` (upload errors). `alert()` blocks the UI and breaks the design language; inline errors are easy to miss.

**Solution:** New module `frontend/js/toast.js` — temporary notifications in the bottom-right corner.

### Design

- Toast container fixed at `bottom: 24px; right: 24px; z-index: 200`
- Three variants: `error` (red, `--red-bg`), `success` (green, `--success`), `info` (gold, `--gold-bg`)
- Auto-dismiss after 4 seconds; click to dismiss immediately
- Multiple toasts stack vertically — each new toast appears below existing ones
- Entrance animation: `fadeInUp` (matches existing animation in `style.css`)
- Uses existing CSS design tokens only — no new colors

### API

```js
import { toast } from './toast.js';
toast('File too large. Maximum size is 25 MB.', 'error');
toast('Analysis complete!', 'success');
toast('Downloading output files...', 'info');
```

### Replaces

- All `alert()` calls in `upload.html` (file type and size validation)
- The `showErr()` / `hideErr()` pattern in `upload.html`
- Error display in `view.html` and `library.html`

### Files

- **New:** `frontend/js/toast.js`
- **Modified:** `frontend/css/style.css` (toast styles: container, item, variants, animations)
- **Modified:** `frontend/upload.html`, `frontend/view.html`, `frontend/library.html` (replace alert/inline-error with toast calls)

---

## 2. Confirmation Dialogs

**Problem:** Destructive actions (logout, remove file) execute instantly with no confirmation. A misclick on "Log out" loses in-progress uploads.

**Solution:** New module `frontend/js/confirm.js` — lightweight modal dialog that returns a `Promise<boolean>`.

### Design

- Centered overlay with `backdrop-filter: blur(4px)` (consistent with control bar frosted glass)
- Modal card: white surface (`--surf`), bordered, rounded (`--xl`)
- Message text, two buttons: Cancel (ghost, left) and Confirm (danger/red, right)
- Returns `Promise<boolean>` — resolves `true` on confirm, `false` on cancel
- Keyboard: Escape → cancel (false), Enter → confirm (true)
- Focus trapped inside modal while open
- Uses existing CSS tokens — no new colors or dimensions

### API

```js
import { confirm } from './confirm.js';
const ok = await confirm('Log out? You will lose any in-progress uploads.');
if (ok) { /* proceed */ }
```

### Applied to

- Logout button — all authenticated pages (`upload.html`, `library.html`, `view.html`)
- Remove file button — `upload.html`

### Files

- **New:** `frontend/js/confirm.js`
- **Modified:** `frontend/css/style.css` (modal overlay, modal card styles)
- **Modified:** `frontend/upload.html`, `frontend/library.html`, `frontend/view.html`

---

## 3. Focus-Visible Styles for All Interactive Elements

**Problem:** `.doc-item`, `.prov-btn`, `.tab`, `.fc` (flashcard) have no visible focus styles. Keyboard users cannot tell which element is focused.

**Solution:** Add `:focus-visible` outlines to all interactive elements that lack them.

### CSS additions (`style.css`)

```css
.doc-item:focus-visible,
.prov-btn:focus-visible,
.tab:focus-visible,
.fc:focus-visible {
  outline: 2px solid var(--gold);
  outline-offset: 2px;
}
```

Matches the existing `.btn:focus-visible` style — gold outline, 2px offset. No new tokens.

### Files

- **Modified:** `frontend/css/style.css`

---

## 4. Print Styles

**Problem:** No `@media print` rules. Printing flashcards or summaries produces unstyled output with chrome elements (control bar, logout button) still visible.

**Solution:** Add `@media print` to `style.css`.

### Print rules

- **Hide:** `.control-bar`, `.top-bar`, `footer`, `.btn-danger`, `.provider-toggle`, `#prog-section`, `.res-actions`, `.fc-hint`, `.toggle-pill`
- **Show all tabs at once:** All `.panel` display as block; all `.tab.on` and `.tab` get visible borders; tab buttons hidden since content is flat
- **Flashcards:** Force white background (`#fff`), remove flip animation, show both `.fc-front` and `.fc-back` stacked vertically (not backface-hidden), black text
- **Summary/Key Points:** Black text on white, no background colors, keep headings
- **Page breaks:** `break-inside: avoid` on `.fc` to keep each card together; `break-before: page` before the flashcards section if >3 cards
- **Links:** Show URL in parentheses for any `<a>` tags

### Files

- **Modified:** `frontend/css/style.css`

---

## 5. Stagger Animation Limit Fix

**Problem:** Library document list stagger is hardcoded with `nth-child(1)` through `nth-child(10)`. Users with 11+ documents get no entrance animation on items 11+.

**Solution:** Remove CSS `nth-child` rules. Add `animation-delay` dynamically via JS when rendering the document list.

### Implementation

In `app.js`: export a `renderDocList(container, docs)` function that sets `element.style.animationDelay = (index * 40) + 'ms'` on each `.doc-item`.

In `style.css`: remove the 10 `nth-child` rules (lines 592–601). Keep the base `.doc-item` animation rule.

### Files

- **Modified:** `frontend/js/app.js` (add `renderDocList` helper)
- **Modified:** `frontend/css/style.css` (remove nth-child rules)
- **Modified:** `frontend/library.html` (use `renderDocList`)

---

## 6. View Page Loading State

**Problem:** `view.html` hides the skeleton loader and shows either error or results. But the actual `.md` file downloads happen after — user sees a blank results section during the fetch.

**Solution:** Keep skeleton visible while downloading `.md` files. Only hide skeleton and show results once all downloads complete (or fail).

### Implementation

Current order: hide skeleton → show results → then download files.
New order: show skeleton → download files → then hide skeleton and show results.

The skeleton HTML with `.skeleton-card` and `.skeleton-line` classes already exists in `view.html`. No CSS changes needed — just reorder the JS.

### Files

- **Modified:** `frontend/view.html` (reorder JS execution)

---

## 7. Progress ETA

**Problem:** Progress bar shows percentage only. Users don't know whether to wait or come back later.

**Solution:** Track `startTime` when upload begins. Compute elapsed time and estimate remaining based on progress percentage. Display below the progress bar.

### Implementation

```js
let startTime = Date.now();
// On each progress update:
const elapsed = (Date.now() - startTime) / 1000;
const pct = doc.progress / 100;
const estimated = pct > 0 ? Math.round(elapsed / pct - elapsed) : null;
// Show: "About 30s remaining" or "Less than a minute remaining"
```

Display in the existing `.prog-msg` element alongside the spinner. Use human-readable times: "Less than 10s", "About 30s", "About 2 min".

### Files

- **Modified:** `frontend/upload.html`

---

## 8. Silent Error Logging

**Problem:** Multiple `catch {}` blocks swallow errors with no logging. Impossible to debug production issues.

**Solution:** Add `console.error()` in every empty catch block.

### Blocks to fix

| File | Location | Current | Fix |
|------|----------|---------|-----|
| `upload.html` | Auth check (line ~118) | `catch { session=null; user=null; }` | Add `console.error('Auth check failed:', err)` |
| `upload.html` | Poll loop (line ~196) | `catch { failCount++; }` | Add `console.error('Poll failed:', err)` |
| `upload.html` | Download outputs (line ~248) | `catch { downloadFailed=true; }` | Add `console.error('Download failed:', err)` |
| `view.html` | Auth check | `catch { session=null; user=null; }` | Add `console.error('Auth check failed:', err)` |
| `view.html` | Download outputs | `catch { downloadFailed=true; }` | Add `console.error('Download failed:', err)` |
| `library.html` | Auth check | `catch { session=null; user=null; }` | Add `console.error('Auth check failed:', err)` |

### Files

- **Modified:** `frontend/upload.html`, `frontend/view.html`, `frontend/library.html`

---

## 9. Download Buttons

**Problem:** Users can view outputs in the browser but cannot download them for offline study or printing.

**Solution:** Add download buttons to the results section on both `upload.html` and `view.html`.

### Design

- **Per-tab download icon:** Small download button (`.btn-ghost .btn-xs`) in each panel's top-right area. Downloads that tab's `.md` file using `URL.createObjectURL` + programmatic `<a>` click.
- **"Download All" button:** In `.res-actions` area (next to existing "View full page" and "New PDF" buttons). Triggers three sequential downloads with 300ms delays between to avoid browser popup blocking.
- File naming: downloads from the blob already in memory (no re-fetch needed since the `.md` files are already loaded to render the view).
- File names: `{original_filename}_summary.md`, `{original_filename}_key_points.md`, `{original_filename}_flashcards.md`

### API in `app.js`

```js
export function downloadBlob(content, filename) {
  const blob = new Blob([content], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
```

### Files

- **Modified:** `frontend/js/app.js` (add `downloadBlob` helper)
- **Modified:** `frontend/upload.html` (add download buttons to results, wire up)
- **Modified:** `frontend/view.html` (add download buttons to results, wire up)
- **Modified:** `frontend/css/style.css` (download button positioning in panels)

---

## 10. `crypto.randomUUID` Polyfill

**Problem:** `crypto.randomUUID()` throws `TypeError: not a function` in non-secure contexts (HTTP, not localhost).

**Solution:** Add fallback UUID v4 generator.

### Implementation (already done)

```js
const docId = (typeof crypto !== 'undefined' && crypto.randomUUID)
  ? crypto.randomUUID()
  : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
```

### Files

- **Modified:** `frontend/upload.html` ✅ (already applied)

---

## 11. Responsive Layout — PC vs Mobile

**Problem:** Single `max-width: 680px` layout is too narrow on desktop. Same layout serves all screen sizes.

**Solution:** Add desktop breakpoint at `900px` while keeping the same theme tokens.

### Layout changes at `@media (min-width: 900px)`

| Aspect | Mobile (<900px) | Desktop (≥900px) |
|--------|----------------|-------------------|
| Content max-width | `680px` | `880px` |
| Card padding | `24px` | `40px` |
| Wrap padding | `40px 16px 72px` | `56px 24px 96px` |
| Flashcard grid | 1 column | 2 columns (`minmax(280px, 1fr)`) |
| Logo size | `1.8rem` | `clamp(2.2rem, 5vw, 3.2rem)` |
| Tab buttons | Smaller font, full-width | Larger font, more horizontal spacing |

**Tokens unchanged:** colors, fonts, gold accent, dark/light mode, radius values, shadows. Only layout values adjust.

**Breakpoint choice:** 900px covers tablets in portrait (768px) as "mobile" while giving true desktops the wider layout. The 680→880 jump keeps optimal reading line length (still under 90 characters/line).

### Files

- **Modified:** `frontend/css/style.css` (add `@media (min-width: 900px)` section)

---

## 12. Flashcard Height Bug Fix

**Problem:** Long answers underlap the card boundary. Front and back faces use `position: absolute; inset: 0` — both locked to the container's hardcoded `min-height: 140px`. When the answer is longer than the question, content overflows.

**Root cause:** Both faces are absolutely positioned in the same stacking context. They cannot influence the parent's height. The parent height is always `min-height: 140px` regardless of content.

**Solution:** Replace absolute positioning with **CSS Grid stacking**. Both faces sit in the same grid cell, the container naturally sizes to the tallest face.

### Before

```css
.fc-inner {
  position: relative; min-height: 140px;
  transition: transform .5s;
  transform-style: preserve-3d;
}
.fc-front, .fc-back {
  position: absolute; inset: 0;
  backface-visibility: hidden;
}
```

### After

```css
.fc-inner {
  display: grid;
  grid-template-areas: "stack";
  transition: transform .5s;
  transform-style: preserve-3d;
}
.fc-inner > * {
  grid-area: stack;
  min-height: 140px; /* minimum card size, not maximum */
}
.fc-front, .fc-back {
  backface-visibility: hidden;
  /* height auto-sizes to content */
}
```

### Why grid works

- Both children share `grid-area: stack` — they overlap in the same cell
- The grid cell sizes to the **tallest child** (the longer of question or answer)
- `transform: rotateY(180deg)` + `backface-visibility: hidden` still work — the flip is purely CSS transform, independent of the positioning method
- No JavaScript changes needed — the `.flipped` class toggle still works

### Files

- **Modified:** `frontend/css/style.css` (`.fc-inner`, `.fc-front`, `.fc-back` rules)

---

## File Change Summary

| File | Type | Sections |
|------|------|----------|
| `frontend/js/toast.js` | **New** | §1 |
| `frontend/js/confirm.js` | **New** | §2 |
| `frontend/css/style.css` | Modified | §1–§5, §9, §11, §12 |
| `frontend/js/app.js` | Modified | §5, §9 |
| `frontend/upload.html` | Modified | §1, §2, §7, §8, §9, §10 |
| `frontend/view.html` | Modified | §1, §2, §6, §8, §9 |
| `frontend/library.html` | Modified | §1, §2, §5, §8 |

---

## Not In Scope

- Migration to a UI framework (Alpine.js, Petite-Vue)
- Icon sprite system or SVG refactoring
- WebSocket/Realtime progress updates (polling is sufficient)
- Mobile app or PWA
- i18n changes

---

*Design based on analysis of style.css (622 lines), all HTML pages, and all JS modules.*
