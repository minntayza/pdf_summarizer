# Smart PDF Lecture Summarizer — Technical Design

> Phase 2 — Web App with Supabase, User Accounts & Cloud Storage
> Last updated: 2026-06-15

---

## 1. System Overview

A local-first **web application** that lets students upload lecture PDFs and get AI-generated study notes, key exam points, and flashcards — all with persistent user accounts and cloud storage in Supabase.

**What's changing from Phase 1:**
- CLI/Flask replaced by **Supabase Edge Functions** (TypeScript/Deno)
- PDF extraction moves from PyMuPDF (Python) to **`pdf-parse`** (JS) — see §2.6 for fallback plan
- User accounts via **Supabase Auth** (email + password)
- Files stored in **Supabase Storage**, not local disk
- Job history tracked in **Supabase Postgres** with polling-based progress

```
┌─────────────────────────────────────────────────────┐
│  Browser (localhost:3000)                            │
│  ┌───────────────────────────────────────────────┐  │
│  │  Plain HTML/CSS/JS (no framework)             │  │
│  │  - Login / Signup                             │  │
│  │  - Upload PDF (drag & drop)                   │  │
│  │  - Library — past documents + output files    │  │
│  │  - View — summary, key points, flashcards     │  │
│  └───────────────────────────────────────────────┘  │
└──┬──────────┬──────────────┬──────────────┬─────────┘
   │          │              │              │
   │    ┌─────▼──────┐ ┌────▼─────┐ ┌──────▼──────────┐
   │    │ Supabase    │ │ Supabase │ │ Supabase Edge    │
   │    │ Auth        │ │ Storage  │ │ Functions        │
   │    │ email+pass  │ │ pdfs/    │ │                  │
   │    │ signup/login│ │ outputs/ │ │ POST /process    │
   │    └─────────────┘ └──▲───┬───┘ │  - reads PDF     │
   │                       │   │     │  - calls AI      │
   │  ① Upload PDF         │   │     │  - writes outputs │
   │  directly to Storage──┘   │     │  - updates DB     │
   │                           │     │                  │
   │  ② Send storage path     │     │ GET /status/:id   │
   │  to /process ────────────┘     │  - returns job     │
   │                                │    progress + result│
   │  ③ Poll /status/:id           └────────┬───────────┘
   │  or poll DB row directly               │
   │                                   ┌────▼───────────┐
   │  ④ Fetch outputs from ───────────│ Supabase Postgres│
   │  Storage (public URL)            │ documents table  │
   │                                   │ - id, user_id    │
   │                                   │ - filename       │
   │                                   │ - status         │
   │                                   │ - progress (0-100)│
   │                                   │ - storage paths  │
   │                                   │ - created_at     │
   │                                   └─────────────────┘
```

**Upload flow (revised for large files):**
1. Frontend uploads PDF **directly to Supabase Storage** (`pdfs/{user_id}/{doc_id}.pdf`) using the Supabase JS SDK — bypasses the 6 MB Edge Function body limit
2. Frontend sends `{ doc_id, pdf_path, provider }` to `POST /process`
3. Edge Function downloads the PDF from Storage, processes it, writes `.md` outputs
4. Frontend polls `GET /status/:doc_id` for progress, then fetches output URLs when done

## 2. Components

### 2.1 Frontend — Static HTML/CSS/JS

Served locally via `npx serve .` or `python -m http.server` on `localhost:3000`.

**Tech:** Zero build-step. Vanilla HTML, CSS, JS. Supabase JS SDK loaded via CDN.

**Pages:**

| Page | Route | Description |
|------|-------|-------------|
| Login | `index.html` | Email + password login form, link to signup |
| Signup | `signup.html` | Email + password + confirm password, link to login |
| Upload | `upload.html` | Drag-and-drop PDF, select AI provider, submit. Uploads to Storage first, then triggers processing. |
| Library | `library.html` | List of user's past uploads with status badges (processing / done / error), click to view |
| View | `view.html?id=<id>` | Tabbed display: Summary / Key Points / Flashcards. Redirects to library if no `id` param. |

**Auth flow:** On login, Supabase JS SDK stores a JWT in `localStorage`. Every page checks for a valid session on load — redirects to `index.html` if missing. The JWT is sent with requests to Supabase services automatically by the SDK.

**Flashcard interaction:** Click-to-flip cards, same as current `app.py` UI. Grid layout, responsive.

**Upload flow (frontend side):**
1. User selects/drops PDF → validate size (<25 MB), show file chip
2. On submit: upload PDF to Storage via `supabase.storage.from('pdfs').upload(...)` with progress bar
3. Once uploaded, call `POST /process-pdf` with `{ doc_id, pdf_path: "pdfs/{user_id}/{doc_id}.pdf", provider }`
4. Show progress bar — poll `GET /status/{doc_id}` every 1–2 seconds
5. On status `done`, display results inline or redirect to view page

### 2.2 Supabase Edge Functions

Two lightweight endpoints:

#### `POST /process-pdf` — Trigger processing

**Trigger:** HTTP POST from frontend  
**Auth:** Requires valid Supabase JWT in `Authorization` header  
**Body:** `{ doc_id: string, pdf_path: string, provider: "claude" | "gemini" }`

**Flow:**
```
POST /process-pdf
  │
  ├─ 1. Validate JWT (reject if missing/invalid)
  ├─ 2. Validate body: doc_id, pdf_path, provider
  ├─ 3. Check that pdf_path belongs to the authenticated user
  ├─ 4. Insert row into `documents` with status='processing', progress=0
  ├─ 5. Return immediately: { doc_id, status: "processing" }   ← fast response
  │
  │  (background — same invocation, no separate queue)
  │
  ├─ 6. Download PDF from Storage (pdf_path)
  ├─ 7. Extract text with pdf-parse → update progress=20
  ├─ 8. Build prompt (reuse existing prompts.py logic, ported to TS)
  ├─ 9. Call AI API → update progress=50
  ├─10. Parse JSON response → validate shape → update progress=80
  ├─11. Write three .md files to Storage `outputs/{user_id}/{doc_id}/`
  ├─12. Update documents row: status='done', progress=100, output_prefix, page_count, word_count, flashcard_count
  └── If any step fails: update row with status='error', error_msg
```

**Why split into two steps (return fast + background):** The AI call takes 15–45 seconds. Returning immediately (step 5) avoids browser timeout. The frontend polls `/status/:doc_id` for progress.

#### `GET /status/:doc_id` — Check progress

**Auth:** Valid JWT required  
**Response:**
```json
{
  "doc_id": "...",
  "status": "processing",   // "processing" | "done" | "error"
  "progress": 50,           // 0–100
  "progress_msg": "Calling Claude AI…",
  "filename": "lecture.pdf",
  "page_count": 42,
  "word_count": 12345,
  "flashcard_count": null,
  "result": null,           // populated when status='done'
  "error": null             // populated when status='error'
}
```

When `status` is `done`, `result` contains:
```json
{
  "summary_url": "https://.../outputs/{user_id}/{doc_id}/summary.md",
  "key_points_url": "https://.../outputs/{user_id}/{doc_id}/key_points.md",
  "flashcards_url": "https://.../outputs/{user_id}/{doc_id}/flashcards.md",
  "summary": "...",
  "key_points": "...",
  "flashcards": [{"question": "...", "answer": "..."}]
}
```

**Error handling:**

| Scenario | HTTP Status | Response |
|----------|-------------|----------|
| No JWT | 401 | `{ error: "Authentication required" }` |
| Missing body fields | 400 | `{ error: "Missing required fields: ..." }` |
| Path doesn't belong to user | 403 | `{ error: "Access denied" }` |
| PDF not found in Storage | 404 | `{ error: "PDF not found" }` |
| AI API error | (in status) | `{ status: "error", error: "AI provider error: ..." }` |
| JSON parse failure | (in status) | `{ status: "error", error: "Unexpected AI response format" }` |
| Edge Function timeout | (in status) | `{ status: "error", error: "Processing took too long. Try a smaller PDF." }` |

**Edge Function timeout:** Supabase free tier has a ~60s wall-clock limit for Edge Functions. Most lecture PDFs process in 15–45 seconds. If a large PDF (>60 pages) with slow AI response exceeds the limit, the row is left with status='error' and a timeout message. The user can re-upload or try a smaller file.

**API keys:** The Edge Function reads `ANTHROPIC_API_KEY` and `GEMINI_API_KEY` from Supabase secrets — never exposed to the frontend.

**Hosting note:** The frontend HTML/CSS/JS is served locally (localhost). Generated output files are stored in Supabase Storage (cloud), so they are accessible from any machine once you log in. Phase 3 could deploy the frontend to Supabase Static Hosting for full cloud access — but the local-first approach keeps Phase 2 simple and avoids deployment friction.

### 2.3 Supabase Storage

Two buckets (private):

| Bucket | Purpose | Access |
|--------|---------|--------|
| `pdfs` | Uploaded lecture PDFs | User can read/write own files only |
| `outputs` | Generated .md files (summary, key_points, flashcards) | User can read own files only |

**RLS Policies for Storage buckets:**

Storage RLS is separate from Postgres RLS — it uses SQL policies on `storage.objects`.

```sql
-- pdfs bucket: users can only access their own folder
CREATE POLICY "Users can upload their own PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read their own PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- outputs bucket: same pattern
CREATE POLICY "Users can read their own outputs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'outputs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

**File structure:**
```
pdfs/
  └── {user_id}/
       └── {doc_id}.pdf

outputs/
  └── {user_id}/
       └── {doc_id}/
            ├── summary.md
            ├── key_points.md
            └── flashcards.md
```

All paths follow `{user_id}/{doc_id}.*` — the `user_id` prefix enforces privacy through RLS.

### 2.4 Supabase Database — `documents` table

```sql
CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename        TEXT NOT NULL,
  provider        TEXT NOT NULL DEFAULT 'claude',
  status          TEXT NOT NULL DEFAULT 'processing',  -- 'processing', 'done', 'error'
  progress        INTEGER NOT NULL DEFAULT 0,           -- 0–100
  progress_msg    TEXT NOT NULL DEFAULT 'Starting…',
  pdf_path        TEXT NOT NULL,                        -- 'pdfs/{user_id}/{doc_id}.pdf'
  output_prefix   TEXT,                                 -- 'outputs/{user_id}/{doc_id}/' — set when done
  error_msg       TEXT,
  page_count      INTEGER,
  word_count      INTEGER,
  flashcard_count INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: users can only see their own documents
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id);
```

**Storage paths in the table:**
- `pdf_path` — where the uploaded PDF lives in Storage (set at creation)
- `output_prefix` — folder where generated `.md` files live (set on completion)
- The frontend constructs full URLs from `output_prefix` + filename (e.g., `output_prefix + 'summary.md'`)

### 2.5 Prompt & AI (Migrated from `prompts.py`)

The prompt templates and output validation from Phase 1 are ported directly to TypeScript inside the Edge Function. Same system prompt, same three-output structure (`summary`, `key_points`, `flashcards`), same flashcard Q&A format. No Pydantic — manual JSON shape validation in TypeScript (check for `summary`, `key_points`, `flashcards` keys + flashcard array shape).

**Provider support:** Claude (default, `claude-sonnet-4-6`) and Gemini (`gemini-1.5-flash`). Model configurable via environment secrets.

### 2.6 PDF Text Extraction — `pdf-parse` vs PyMuPDF

`pdf-parse` (npm) extracts text in the Edge Function's Deno runtime. It handles most academic PDFs well, but has known limitations:

| Scenario | pdf-parse behavior | Mitigation |
|----------|-------------------|------------|
| Single-column text | ✅ Works well | — |
| Multi-column layouts | ⚠️ May interleave columns | Accept as known limitation; most lecture PDFs are single-column |
| Scanned/image PDFs | ❌ No text extracted | Returns clear error: "No extractable text" |
| Embedded fonts / Unicode | ⚠️ Some symbols may be garbled | Edge Function logs the first 500 chars for debugging |
| PDFs with forms/annotations | ⚠️ May miss annotation text | Accept as limitation |

**Fallback plan:** If real-world testing shows pdf-parse is inadequate on your lecture PDFs, Phase 2.1 can add a small Python microservice (Flask endpoint wrapping PyMuPDF) that the Edge Function calls for text extraction. No architecture changes needed — just swap the extraction call. For now, proceed with pdf-parse and test with your actual lecture files.

## 3. Output Format (Unchanged from Phase 1)

Same three Markdown files:
- `summary.md` — bullet-point lecture notes organized by topic
- `key_points.md` — 🔴 High Priority / 🟡 Medium Priority / ⚠️ Common Pitfalls
- `flashcards.md` — Q&A pairs (click-to-flip in the web UI)

## 4. Error Handling

| Scenario | User sees |
|----------|-----------|
| Not logged in | Redirected to login page |
| Invalid login | "Invalid email or password" inline message |
| PDF > 25 MB | "File too large. Please upload a PDF under 25 MB." |
| Storage upload fails | "Upload failed. Check your connection and try again." |
| No extractable text | "This PDF has no extractable text. Use a text-based PDF." |
| AI call fails | "The AI service is currently unavailable. Try again later." (shown in Library as error badge) |
| Processing timeout | "Processing took too long. Try a smaller PDF." (shown in Library) |
| View page with no `id` | Redirected to Library page |
| View page with invalid/missing doc | "Document not found" with link back to Library |

## 5. Project Structure

```
smart_pdf_lecture_summarizer/
├── frontend/                  # Static files served locally
│   ├── index.html             # Login page
│   ├── signup.html            # Signup page
│   ├── upload.html            # Upload + process PDF (main page)
│   ├── library.html           # List of past documents
│   ├── view.html              # View output (summary, key points, flashcards)
│   ├── css/
│   │   └── style.css          # Shared stylesheet
│   └── js/
│       ├── auth.js            # Signup/login/logout helpers
│       ├── supabase-client.js # Supabase SDK initialization
│       └── app.js             # Shared utilities
├── supabase/
│   ├── functions/
│   │   └── process-pdf/
│   │       ├── index.ts       # Edge Function: POST /process-pdf + GET /status/:id
│   │       ├── prompts.ts     # Prompt templates (ported from prompts.py)
│   │       ├── extract.ts     # PDF text extraction (pdf-parse)
│   │       └── deno.json      # Deno imports
│   └── migrations/
│       └── 001_create_documents.sql  # documents table + RLS + storage policies
├── PROPOSAL.md                # Vision and scope
├── design.md                  # This design document
└── README.md                  # Updated getting-started
```

**Files removed (Phase 1 artifacts):**
- `app.py` — replaced by Edge Functions
- `main.py` — replaced by Edge Functions
- `pdf_reader.py` — replaced by `extract.ts`
- `prompts.py` — replaced by `prompts.ts`
- `config.py` — replaced by Supabase secrets / env
- `requirements.txt` — no longer applicable
- `input/` and `output/` directories — files now go to Supabase Storage

## 6. Security

- **Auth enforcement:** Every Edge Function call and Storage access requires a valid JWT
- **API keys server-side only:** Claude/Gemini keys stored in Supabase secrets, never exposed to browser
- **Row Level Security (Postgres):** Users can only SELECT/INSERT/UPDATE their own rows in `documents`
- **Row Level Security (Storage):** Users can only access files under their `{user_id}/` prefix in both buckets
- **Input validation:** PDF file type + size checked client-side before upload; path ownership verified server-side
- **Passwords:** Handled entirely by Supabase Auth — never touches our code

## 7. Dependencies

**Edge Function (Deno):**
- `pdf-parse` (npm) — PDF text extraction
- `@supabase/supabase-js` — Supabase client (Storage + DB)
- `@anthropic-ai/sdk` or `fetch` — Claude/Gemini API calls

**Frontend (CDN, no build step):**
- Supabase JS SDK (`@supabase/supabase-js` via CDN / esm.sh)
- No other dependencies

## 8. Future Considerations (Phase 3+)

- **Batch upload:** Process multiple PDFs at once
- **Anki export:** Download flashcards as `.apkg` for spaced repetition
- **Share links:** Generate a read-only link to share summary with classmates
- **Custom prompts:** Let users choose prompt style (detailed vs concise, language preference)
- **Supabase Realtime:** Subscribe to DB changes for live progress instead of polling
- **PWA:** Make it installable as a standalone app
- **Frontend hosting:** Deploy to Supabase Static Hosting for full cloud access (no localhost)

---

*Written during brainstorming session, 2026-06-15*
