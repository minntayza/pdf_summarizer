# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Smart PDF Lecture Summarizer — a serverless web app that processes lecture PDFs into summaries, key points, flashcards, and quizzes using AI (Claude or Gemini). Bilingual (English + Myanmar/Burmese).

## Running Locally

There is **no build step**. The frontend is static HTML/CSS/JS served directly.

```bash
cd frontend
python3 -m http.server 3000
# Open http://localhost:3000
```

No test framework or linter is configured.

## Architecture

**Frontend** — Vanilla JS ES modules in `frontend/`. No bundler, no transpiler. Supabase JS SDK is loaded via import maps from `esm.sh` CDN (see `frontend/js/supabase-client.js`). Pages: `index.html` (login), `signup.html`, `upload.html`, `library.html`, `view.html`, `review.html`, `rooms.html`, `room.html`, `subjects.html`.

**Backend** — Two Supabase Edge Functions (Deno/TypeScript) in `supabase/functions/`:
- `process-pdf` — Downloads PDF from Storage, extracts text via `pdf-parse`, calls Claude or Gemini API, writes markdown outputs back to Storage, updates DB. Returns 202 immediately; processing runs in background via `EdgeRuntime.waitUntil()`. Supports vision mode (base64 PDF) and text fallback with chunking.
- `chat-pdf` — Conversational Q&A over a PDF. Re-extracts text, fetches chat history, calls AI with context.

**Database** — Supabase Postgres with Row Level Security (RLS) on all tables. Migrations in `supabase/migrations/` (numbered sequentially). Tables: `documents`, `subjects`, `flashcard_reviews`, `chat_messages`, `study_rooms`, `room_members`, `room_documents`, `user_streaks`.

**Storage** — Two private buckets: `pdfs` (25MB, PDF only) and `outputs` (10MB, markdown). PDFs are uploaded directly from the browser to Storage (not through Edge Functions) to avoid body size limits.

**Processing flow**: Upload PDF → `POST /process-pdf` → poll `GET /status/:doc_id` → render outputs when complete.

## Key Technical Patterns

- **Frontend auth**: Supabase Auth with email/password. JWT stored client-side. Protected pages call `initPage()` from `page-init.js` on load to check session.
- **i18n**: Custom translation system in `frontend/js/i18n.js` with `data-i18n` attributes on HTML elements and `t()` function for JS.
- **SRS (Spaced Repetition)**: SM-2 algorithm in `frontend/js/srs.js` for flashcard scheduling.
- **AI provider selection**: Frontend sends `provider` ("claude" or "gemini") to Edge Functions. Default model is `claude-sonnet-4-6` for Claude, `gemini-2.5-flash` for Gemini.
- **Prompt templates**: All AI prompts and output validation logic live in `supabase/functions/process-pdf/prompts.ts`.
- **Shared page init**: Most pages include `page-init.js`, `ui-init.js`, `shared-ui.js`, and `i18n.js` for consistent initialization (auth check, theme, language, font size).

## Deploying Edge Functions

```bash
npx supabase functions deploy process-pdf
npx supabase functions deploy chat-pdf
```

Set API keys as Edge Function secrets:
```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase secrets set GEMINI_API_KEY=...
```

## External Services

- **Proxy endpoint**: When `ANTHROPIC_BASE_URL` is set to something other than `https://api.anthropic.com`, the Edge Functions route through that proxy. Proxy requests get **smaller chunk size** (20k chars vs 60k), **shorter timeout** (120s vs 180s per attempt, ~240s with retry), **reduced max_tokens** (3072 English / 6144 non-English), and **vision mode is disabled** (only official API supports the `document` content type).
- **Secrets**: `ANTHROPIC_API_KEY`, `ANTHROPIC_BASE_URL` (optional proxy), `GEMINI_API_KEY` (optional), `CLAUDE_MODEL` (optional, defaults to `claude-sonnet-4-6`).

## Processing Progress Stages

The `process-pdf` Edge Function updates the `documents` table with progress values as it works:

| % | Stage |
|---|---|
| 0 | Starting |
| 10 | Downloading PDF from Storage |
| 15 | Extracting text via pdf-parse |
| 25 | Extraction complete (page/word counts) |
| 30 | Calling AI (vision mode or text-only) |
| 40-60 | Chunked processing (multi-chunk PDFs) |
| 60 | **Retry** — first AI call failed, retrying once |
| 80 | Writing output files to Storage |
| 100 | Complete |

**Stuck-at-60% bug**: If both the first call AND the retry fail (e.g. proxy timeout), the Edge Function throws without updating `status: "error"`, leaving the document permanently stuck at "Processing". The fix is in the single-shot code path at `index.ts:~259` — the retry call is now wrapped in its own try/catch so the error propagates to the outer handler.

## Full-Text Search

PostgreSQL FTS is set up in migration `008` (search_vector tsvector with GIN index, trigger on filename + summary_text). The frontend in `library.html` uses PostgREST's `.textSearch()`:

```js
sb.from('documents').select('...')
  .textSearch('search_vector', query, { type: 'websearch', config: 'english' })
```

When `searchQuery` is non-empty, filtering goes server-side. When empty, it falls back to in-memory `Array.filter()` to avoid unnecessary DB hits. Search input is debounced at 300ms. The FTS query gracefully degrades to client-side `String.includes()` on error.

## Study Room Management

- **`rooms.js`** exports: `getRooms`, `createRoom`, `joinRoom`, `getRoomMembers`, `getRoomDocuments`, `shareDocument`, `removeDocument`, `leaveRoom`, `deleteRoom`, `getRoomByInviteCode`.
- **Room creator** sees "Delete Room" button (not "Leave Room") and trash icons on each shared document. Non-creators see only "Leave Room".
- **Room deletion** cascades via DB foreign keys (all room_members, room_documents are deleted automatically when study_rooms row is removed).

## Deployment

Frontend deploys to Vercel as a static site. `vercel.json` rewrites all routes to serve from `frontend/` directory.

**CORS note**: Uploads from `localhost:3000` to Supabase Storage may fail with `net::ERR_FAILED` if the Supabase project's CORS isn't configured for localhost. Production (Vercel) works fine.

Edge Functions:
```bash
npx supabase functions deploy process-pdf
npx supabase functions deploy chat-pdf
```

Set secrets:
```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase secrets set ANTHROPIC_BASE_URL=https://proxy.example.com  # optional custom proxy
npx supabase secrets set GEMINI_API_KEY=...   # optional
```

## Conventions

- Frontend JS uses ES module imports (`import ... from '...'`) with no bundler.
- CSS follows academic Swiss design with light/dark theme support. Fonts: EB Garamond (headings), Atkinson Hyperlegible (body).
- Edge Functions use Deno runtime with imports configured in each function's `deno.json`.
- Database changes require a new numbered migration file in `supabase/migrations/`.
- RLS policies are critical — every table has policies ensuring users only access their own data. Study rooms have special policies for shared access via `room_members` join.
- Migration files should be idempotent: use `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS` before `CREATE POLICY`, and wrap `CREATE INDEX` in `IF NOT EXISTS` guards. Never leave duplicate same-number migrations (e.g. `002_orig.sql` + `002_fixed.sql`).
