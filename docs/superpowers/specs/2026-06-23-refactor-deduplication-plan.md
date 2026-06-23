# Implementation Plan: Reduce JS/HTML Duplication

**Spec**: `docs/superpowers/specs/2026-06-23-refactor-deduplication-design.md`

## Execution Order

Steps 1-2 are foundation work (no pages change behavior). Steps 3-4 apply the refactoring to all pages. Step 5 is cleanup.

---

### Step 1: Create `page-init.js`

**File**: `frontend/js/page-init.js` (NEW)

Create the shared page initialization module. This has no effect until pages start importing it.

```js
import { sb } from './supabase-client.js';
import { getSession, getUser, redirectIfAuth } from './auth.js';
import { injectControlBar } from './shared-ui.js';
import { initUI, renderI18n } from './ui-init.js';
import { t } from './i18n.js';
import { confirm } from './confirm.js';

export async function initPage({ onLangChange, requireAuth = true }) {
  injectControlBar();

  let session = null, user = null;

  if (requireAuth) {
    const sessResult = await getSession();
    session = sessResult.session;
    if (!session && !sessResult.error) {
      window.location.href = 'index.html';
      return { session: null, user: null };
    }
    if (session) {
      const userResult = await getUser();
      user = userResult.user;
      const emailEl = document.getElementById('user-email');
      if (emailEl && user) emailEl.textContent = user.email;

      const logoutBtn = document.getElementById('logout-btn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
          const ok = await confirm(t('logOut') + '?');
          if (ok) { await sb.auth.signOut(); window.location.href = 'index.html'; }
        });
      }
    }
  } else {
    const redirected = await redirectIfAuth();
    if (redirected) return { session: null, user: null };
  }

  initUI(onLangChange || renderI18n);
  renderI18n();

  return { session, user };
}
```

**Verify**: No pages import it yet — app should work identically after this step.

---

### Step 2: Deduplicate Helper Functions

**2a. `frontend/js/chat.js`** — Remove `escapeHtml`, import `esc` from `app.js`

- Add import: `import { esc } from './app.js';`
- Replace all `escapeHtml(x)` calls with `esc(x).replace(/\n/g, '<br/>')`
- Delete the `escapeHtml` function (lines 131-138)

**2b. `frontend/js/supabase-client.js`** — Remove dead code

- Remove `let _client = null;`
- Remove `export function initSupabase() { ... }`
- Keep `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `export const sb`

**2c. `frontend/js/i18n.js`** — Remove unused exports

- Remove `export function tAll() { ... }` (lines 381-383)
- Remove `window.__t = function(key) { return t(key); };` (line 386)

**Verify**: App should work identically after this step.

---

### Step 3: Update Auth Pages (index.html, signup.html)

These pages use `requireAuth: false` (redirect-if-authored).

**`frontend/index.html`** — Replace inline `<script type="module">` content:
- Remove imports: `sb` from supabase-client, `initUI`/`renderI18n` from ui-init, `injectControlBar` from shared-ui
- Remove: `injectControlBar()` call, session check block, `initUI`/`renderI18n` calls
- Add: `import { initPage } from './js/page-init.js';` and `await initPage({ requireAuth: false, onLangChange: renderAll });`
- Keep: page-specific login form logic (form handler, password toggle)

**`frontend/signup.html`** — Same pattern:
- Remove boilerplate imports and auth check
- Add `initPage({ requireAuth: false, onLangChange: renderAll })`
- Keep: page-specific signup form logic (form handler, password toggles)

**Verify**: Login and signup pages work. Already-logged-in users redirect to upload.

---

### Step 4: Update Protected Pages (7 pages)

Each page follows the same pattern: remove boilerplate, replace with `initPage()`.

**4a. `frontend/upload.html`**

- Remove: `injectControlBar` import/call, auth try/catch block, session redirect, email display, logout handler, `initUI`/`renderI18n` calls
- Remove: `confirm` import (used only in logout handler, now in page-init)
- Add: `import { initPage } from './js/page-init.js';`
- Replace with: `const { user } = await initPage({ onLangChange: () => { renderI18n(); ... } });`
- Keep: all upload-specific logic (file handling, progress, results, chat)

**4b. `frontend/library.html`**

- Same boilerplate removal
- Note: `confirm` import stays — used for delete confirmation too
- Keep: document loading, subject filter, delete/rename logic

**4c. `frontend/view.html`**

- Same boilerplate removal
- Keep: document loading, tabs, download buttons, chat

**4d. `frontend/subjects.html`**

- Same boilerplate removal
- Keep: subject CRUD, color picker

**4e. `frontend/rooms.html`**

- Same boilerplate removal
- Keep: room listing, create/join forms

**4f. `frontend/room.html`**

- Same boilerplate removal
- Keep: room detail, member list, shared docs

**4g. `frontend/review.html`**

- Same boilerplate removal
- Keep: SRS review card logic

**Verify**: All pages load, auth works, logout works, page-specific features work.

---

### Step 5: Cleanup

**5a. Delete `frontend/library.html.bak`**

```bash
git rm frontend/library.html.bak
```

**5b. Move inline styles to CSS**

In `frontend/subjects.html` and `frontend/rooms.html`, replace inline `style="..."` attributes on form elements with CSS classes.

Add to `frontend/css/style.css`:
```css
.form-row {
  display: flex;
  gap: 10px;
  align-items: flex-end;
  flex-wrap: wrap;
}
.form-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border2);
  border-radius: var(--rs);
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
  font-size: .88rem;
  outline: none;
}
.form-label {
  /* inherits .provider-label styles, just the label text */
}
```

Update HTML: replace `style="..."` with `class="form-row"`, `class="form-input"`, etc.

**Verify**: Visual appearance unchanged. Forms look identical.

---

## Risk Mitigation

- **Step 1-2**: Zero risk — no behavior changes, just new files and dead code removal
- **Step 3-4**: Medium risk — auth flow changes. Test each page after migration:
  - Logged out → redirects to login
  - Login → redirects to upload
  - Logout → redirects to login
  - Page-specific features still work
- **Step 5**: Low risk — visual-only changes, easy to verify

## Rollback

Each step is independently committable. If a step breaks something, revert that commit.
