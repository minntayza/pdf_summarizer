# Ship WIP: Streaks + Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Commit and verify streaks, full-text search, and room permission WIP — migrations already on remote.

**Architecture:** Frontend calls Supabase directly for streaks (`user_streaks`) and FTS (`documents.search_vector`). `process-pdf` writes `summary_text` on completion. Migration 007 fixes room RLS.

**Tech Stack:** Vanilla JS frontend, Supabase Postgres + Edge Functions, Chrome DevTools MCP for E2E verification

## Global Constraints

- No build step — static HTML/CSS/JS only
- Migrations numbered sequentially in `supabase/migrations/`
- RLS on all tables
- Deploy edge functions via `npx supabase functions deploy`

---

### Task 1: Deploy process-pdf edge function

**Files:**
- Modify: `supabase/functions/process-pdf/index.ts` (already has `summary_text`)

- [ ] **Step 1: Deploy**

```bash
cd /Users/mintayza/Desktop/Projects/smart_pdf_lecture_summarizer
npx supabase functions deploy process-pdf
```

Expected: Deploy succeeds

---

### Task 2: Polish WIP gaps

**Files:**
- Modify: `frontend/room.html` — add `console.error` in empty catch

- [ ] **Step 1: Fix room.html catch block**

Add error logging to copy-failure catch.

---

### Task 3: Start local server

- [ ] **Step 1: Start HTTP server**

```bash
cd frontend && python3 -m http.server 3000
```

---

### Task 4: Chrome DevTools E2E verification

- [ ] **Step 1:** Navigate to `http://localhost:3000/library.html`
- [ ] **Step 2:** Login (or verify session)
- [ ] **Step 3:** Verify search bar visible, type query, confirm results filter
- [ ] **Step 4:** Verify streak display in control bar (if user has streak)
- [ ] **Step 5:** Check console for errors on streak/FTS API calls

---

### Task 5: Commit WIP

- [ ] **Step 1: Stage relevant files and commit**

```bash
git add frontend/js/streak.js frontend/js/page-init.js frontend/js/shared-ui.js \
  frontend/library.html frontend/upload.html frontend/review.html frontend/css/style.css \
  frontend/js/i18n.js supabase/migrations/007_fix_is_room_member_permissions.sql \
  supabase/migrations/008_add_streaks_and_search.sql supabase/functions/process-pdf/index.ts \
  docs/superpowers/specs/2026-06-26-ship-wip-streaks-search-design.md \
  docs/superpowers/plans/2026-06-26-ship-wip-streaks-search-plan.md
git commit -m "feat: ship daily streaks, full-text search, and room permission fix"
```
