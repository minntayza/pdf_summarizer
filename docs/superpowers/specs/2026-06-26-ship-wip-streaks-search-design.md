# Ship WIP: Streaks + Search + Room Permissions — Design Spec

> **Date:** 2026-06-26  
> **Scope:** Deploy and verify uncommitted streaks, full-text search, and room permission fixes  
> **Approach:** Ship existing WIP with minimal polish — no new features

---

## Problem

Three features are implemented in the working tree but not deployed or committed:

1. **Daily study streaks** — `user_streaks` table, `streak.js`, control bar display
2. **Full-text search** — `summary_text` + `search_vector` on `documents`, library search UI
3. **Room member permissions** — `is_room_member()` GRANT fix (migration 007)

Without deploying migrations 007/008 and the updated `process-pdf` edge function, streaks and search fail silently in production.

---

## Solution

### 1. Database (migrations 007 + 008)

- **007:** Re-create `is_room_member()` / `is_room_creator()` with `GRANT EXECUTE` to `authenticated` and `anon`
- **008:** Create `user_streaks` table with RLS; add `summary_text` + `search_vector` to `documents` with GIN index and trigger

### 2. Edge Function (`process-pdf`)

- On completion, write `summary_text: result.summary` to `documents` row (already in WIP code)
- Deploy to remote Supabase project `efkraurkqiavqdilkjpt`

### 3. Frontend (already in WIP)

- `streak.js` — `recordActivity()`, `getStreak()`, `renderStreak()`
- `page-init.js` — calls `renderStreak('streak-display')` on every page
- `upload.html` — `recordActivity()` after processing completes
- `review.html` — `recordActivity()` after flashcard review
- `library.html` — debounced FTS via `.textSearch('search_vector', ...)`
- `shared-ui.js` — `#streak-display` in control bar
- `style.css` — `.streak-flame`, `.search-bar` styles

### 4. Verification

- Chrome DevTools MCP: login → library → search → check streak display
- Confirm migrations applied remotely
- Confirm no console errors on streak/search API calls

---

## Not In Scope

- Myanmar FTS config (english-only `tsvector` for now)
- Streak i18n tooltip strings
- Streak timezone fix
- New Phase 3 features

---

## File Change Summary

| File | Action |
|------|--------|
| `supabase/migrations/007_fix_is_room_member_permissions.sql` | Deploy |
| `supabase/migrations/008_add_streaks_and_search.sql` | Deploy |
| `supabase/functions/process-pdf/index.ts` | Deploy |
| `frontend/js/streak.js` | Commit |
| `frontend/js/page-init.js`, `shared-ui.js`, `library.html`, etc. | Commit |
