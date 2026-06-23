# Refactoring Design: Reduce JS/HTML Duplication

**Date**: 2026-06-23
**Scope**: JS and HTML only (CSS out of scope)
**Goal**: Eliminate duplicated boilerplate across HTML pages and JS modules

## Problem

Every HTML page in the project duplicates ~25-30 lines of identical boilerplate:

- `injectControlBar()` import + call
- Auth session check (try/catch, redirect if no session)
- User email display
- Logout button event listener with confirm dialog
- `initUI()` + `renderI18n()` setup

Additionally:

- `auth.js` exists with proper helpers (`getSession`, `getUser`, `requireAuth`, `redirectIfAuth`) but **no page uses it** — all auth is done inline
- `escapeHtml` is duplicated in `chat.js` and `app.js`
- `supabase-client.js` exports a dead `initSupabase()` function
- `i18n.js` exports unused `tAll()` and attaches unused `window.__t`
- `library.html.bak` is a stale backup file
- HTML pages have inline `style="..."` attributes that should be CSS classes

## Solution

### 1. New `page-init.js` Module

Create `frontend/js/page-init.js` that exports:

```js
export async function initPage({ onLangChange, requireAuth = true })
```

**Behavior:**

1. Calls `injectControlBar()`
2. If `requireAuth === true`:
   - Checks session via `getSession()` from `auth.js`
   - If no session and no error → redirect to `index.html`
   - If session exists → get user, display email in `#user-email`, wire up `#logout-btn` with confirm dialog
3. If `requireAuth === false` (login/signup):
   - Calls `redirectIfAuth()` from `auth.js` → redirect to `upload.html` if already logged in
4. Calls `initUI(onLangChange)` and `renderI18n()`
5. Returns `{ user, session }` for pages that need them

**Imports used internally:**
- `getSession`, `getUser`, `redirectIfAuth` from `auth.js`
- `injectControlBar` from `shared-ui.js`
- `initUI`, `renderI18n` from `ui-init.js`
- `t` from `i18n.js`
- `confirm` from `confirm.js`
- `sb` from `supabase-client.js`

### 2. Deduplicate Helper Functions

**2a. Remove `escapeHtml` from `chat.js`, reuse `esc` from `app.js`**

`chat.js` lines 131-138 defines `escapeHtml()` which is identical to `esc()` in `app.js` except it also converts `\n` to `<br/>`. We do NOT add `\n` → `<br/>` to `esc()` because `esc()` is used in contexts where `<br/>` would be wrong (aria-labels, document names).

Instead, update `chat.js` to import `esc` from `app.js`, delete the local `escapeHtml`, and chain the `\n` conversion locally:

```js
// In chat.js, replace escapeHtml(msg.content) with:
esc(msg.content).replace(/\n/g, '<br/>')
```

This keeps `esc()` as a pure HTML-escaping utility.

**2b. Clean up `supabase-client.js`**

Remove the dead `initSupabase()` function and `_client` variable. Keep only the `sb` export and the URL/key constants.

**2c. Clean up `i18n.js`**

- Remove `tAll()` function (unused)
- Remove `window.__t` assignment (unused)

### 3. Update All HTML Pages

Replace the inline auth/UI boilerplate in each page with `initPage()`:

**Before (each page, ~25 lines):**
```js
import { sb } from './js/supabase-client.js';
import { t } from './js/i18n.js';
import { initUI, renderI18n } from './js/ui-init.js';
import { injectControlBar } from './js/shared-ui.js';
import { confirm } from './js/confirm.js';
injectControlBar();

let session, user;
try {
  const sessResp = await sb.auth.getSession();
  session = sessResp.data?.session;
  const userResp = await sb.auth.getUser();
  user = userResp.data?.user;
} catch (err) { session = null; user = null; }
if (!session) window.location.href = 'index.html';
if (user) document.getElementById('user-email').textContent = user.email;
document.getElementById('logout-btn').addEventListener('click', async () => {
  const ok = await confirm(t('logOut') + '?');
  if (ok) { await sb.auth.signOut(); window.location.href = 'index.html'; }
});
initUI(() => { renderI18n(); /* page-specific */ });
renderI18n();
```

**After (each page, ~2 lines):**
```js
import { initPage } from './js/page-init.js';
const { user } = await initPage({
  onLangChange: () => { /* page-specific i18n updates */ }
});
```

**Page mapping:**

| Page | `requireAuth` | Notes |
|------|---------------|-------|
| `index.html` | `false` | Login page |
| `signup.html` | `false` | Signup page |
| `upload.html` | `true` | Upload + results |
| `library.html` | `true` | Document library |
| `view.html` | `true` | Document viewer |
| `subjects.html` | `true` | Subject management |
| `rooms.html` | `true` | Room listing |
| `room.html` | `true` | Single room view |
| `review.html` | `true` | SRS review session |

### 4. Cleanup Items

1. **Delete `library.html.bak`** — stale backup file
2. **Move inline styles to CSS** — `subjects.html` and `rooms.html` have `style="..."` on form elements. Extract to CSS classes:
   - `.form-row` — flex container with gap
   - `.form-input` — styled input field
   - `.form-label` — provider-label style label

## Out of Scope

- CSS splitting/modularization
- Edge Function deduplication (CORS/auth helpers) — deferred to separate pass
- Extracting inline `<script>` into separate files (Approach B)
- Build tooling introduction

## Files Modified

| File | Change |
|------|--------|
| `frontend/js/page-init.js` | **NEW** — shared page initialization |
| `frontend/js/app.js` | No changes needed — `esc()` stays as-is |
| `frontend/js/chat.js` | Import `esc` from `app.js`, delete `escapeHtml` |
| `frontend/js/supabase-client.js` | Remove `initSupabase()` and `_client` |
| `frontend/js/i18n.js` | Remove `tAll()` and `window.__t` |
| `frontend/index.html` | Use `initPage()` |
| `frontend/signup.html` | Use `initPage()` |
| `frontend/upload.html` | Use `initPage()` |
| `frontend/library.html` | Use `initPage()` |
| `frontend/view.html` | Use `initPage()` |
| `frontend/subjects.html` | Use `initPage()` + move inline styles to CSS |
| `frontend/rooms.html` | Use `initPage()` + move inline styles to CSS |
| `frontend/room.html` | Use `initPage()` |
| `frontend/review.html` | Use `initPage()` |
| `frontend/css/style.css` | Add `.form-row`, `.form-input`, `.form-label` classes |
| `frontend/library.html.bak` | **DELETE** |

## Expected Impact

- ~25 lines of boilerplate removed per page (× 9 pages = ~225 lines removed)
- ~10 lines removed from `chat.js` (deduped `escapeHtml`)
- ~5 lines removed from `supabase-client.js`
- ~5 lines removed from `i18n.js`
- ~1 new file added (`page-init.js`, ~50 lines)
- **Net reduction: ~200 lines**
