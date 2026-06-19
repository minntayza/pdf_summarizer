# Chapter 3 — Personal Project Report

**GitHub Username:** minntayza
**Project:** Smart PDF Lecture Summarizer
**Repo:** https://github.com/minntayza/pdf_summarizer
**Date:** 2026-06-19

---

## 1. What I Built

Smart PDF Lecture Summarizer is a **full-stack web application** that turns academic lecture PDFs into AI-generated study materials. Students log in with email/password, upload lecture PDFs, and receive **summary notes**, **key exam points**, and **interactive flashcards** — all stored in the cloud and accessible from any device.

**Real user:** Myself (@minntayza) — a Burmese university student who receives many lecture PDFs before exams and needs a fast way to extract what matters.

### Phase 1 vs Phase 2

| Phase 1 | Phase 2 |
|---------|---------|
| CLI tool (Terminal) | Web app (Browser) |
| Local file storage | Supabase cloud storage |
| No user accounts | Email + password accounts |
| Python Flask | Supabase Edge Function (Deno/TS) |
| Single-user | Multi-user with RLS |

---

## 2. How Claude Code Helped

This project was built **entirely with Claude Code**. Here's how Claude Code contributed at each stage:

### Architecture & Design
- Started with a vision in `PROPOSAL.md` — Claude Code helped expand this into a full technical design (`design.md`)
- Claude Code designed the architecture: frontend served locally, Supabase cloud for auth/storage/database/edge functions
- Recommended the polling-based progress pattern instead of WebSockets (simpler, zero infra)

### Frontend Development
- Built all 5 HTML pages: login, signup, upload, library, view
- Wrote CSS with a purple/green dark theme, mobile responsive
- Implemented auth helpers, Supabase client initialization, and shared utilities in vanilla JS
- No frameworks, no build step — just clean HTML/CSS/JS

### Backend Development
- Built the Supabase Edge Function in TypeScript/Deno:
  - `index.ts` — handles `POST /process-pdf` and `GET /status/:id`
  - `prompts.ts` — structured AI prompts for summary, exam points, flashcards
  - `extract.ts` — PDF text extraction using pdf-parse
- Set up database migrations with Row Level Security
- Configured Storage bucket policies for per-user file isolation

### Agents & Skills
- **code-reviewer agent** — Reviewed code for bugs, security issues, and performance
- **brainstorming skill** — Used during the design phase to explore approaches
- **pdf-summarizer skill** — Custom skill documenting the project for Claude Code

### MCP Integration
- Configured `.mcp.json` with GitHub and Supabase MCP servers
- Used GitHub MCP for repository management
- Used Supabase MCP for database queries and edge function deployment

---

## 3. Key Features Delivered

- ✅ User signup/login with email + password (Supabase Auth)
- ✅ Drag & drop PDF upload (up to 25 MB)
- ✅ AI-powered summary generation (Claude API)
- ✅ Key exam points extraction
- ✅ Interactive click-to-flip flashcards
- ✅ Persistent library with status badges (processing / done / error)
- ✅ Real-time progress polling during AI processing
- ✅ Row Level Security — users see only their own documents
- ✅ API keys stored server-side (Supabase secrets), never exposed to browser
- ✅ Mobile-responsive dark theme

---

## 4. Technical Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML + CSS + Vanilla JS |
| Auth | Supabase Auth (email/password) |
| Backend | Supabase Edge Functions (Deno/TypeScript) |
| Storage | Supabase Storage |
| Database | Supabase Postgres |
| PDF Parsing | pdf-parse (npm) |
| AI | Claude API + Gemini API |
| MCP | GitHub MCP + Supabase MCP |
| Dev Tools | Claude Code |

---

## 5. Challenges & How I Solved Them

### Challenge 1: Edge Function body size limits
**Problem:** Supabase Edge Functions have a 6 MB body limit, but lecture PDFs can be 20+ MB.

**Solution:** Upload PDFs directly to Supabase Storage from the browser first, then send only the storage path to the Edge Function. The Edge Function downloads the PDF from Storage internally.

### Challenge 2: AI output format not always consistent
**Problem:** Claude/Gemini sometimes returned responses that didn't parse correctly as structured output.

**Solution:** Added retry logic with sharper prompts on parse failure, and surfaced clear error messages to the user instead of crashing.

### Challenge 3: Progress feedback during long AI processing
**Problem:** AI processing can take 30+ seconds, and users need to know what's happening.

**Solution:** Implemented a polling pattern — the Edge Function updates the database row with progress status (processing → done/error), and the frontend polls `GET /status/:id` every few seconds with a visual progress bar.

### Challenge 4: Keeping API keys secure in a browser app
**Problem:** AI API keys must never be exposed to the client-side JavaScript.

**Solution:** All AI calls happen inside the Supabase Edge Function. API keys are stored as Supabase secrets and injected at runtime. The browser never sees them.

---

## 6. What I Learned

1. **Supabase is a complete backend** — Auth, storage, database, and serverless functions all in one platform dramatically reduces the number of services needed.

2. **Row Level Security is powerful but requires careful design** — Every table and bucket needs proper RLS policies. Writing them correctly from the start prevents data leaks.

3. **The polling pattern works well for serverless** — WebSockets require persistent connections which don't fit serverless well. Polling with database-backed status is simpler and more reliable.

4. **Claude Code agents make you a better developer** — The code-reviewer agent caught bugs and security issues I would have missed. Skills enforce a disciplined design → plan → implement workflow.

5. **MCP servers extend what Claude Code can do** — GitHub MCP for repo management, Supabase MCP for database operations — these integrations made the development workflow seamless.

6. **Vanilla JS can still build real apps** — No React, no build tools, no bundlers. Just HTML, CSS, and JavaScript — and it works great for this scope.

---

## 7. Submission Checklist

| Requirement | Status |
|-------------|--------|
| Public GitHub repo | ✅ `github.com/minntayza/pdf_summarizer` |
| Built with Claude Code | ✅ Entire project |
| 3 stars ⭐⭐⭐ | ⬜ Pending (awaiting teammates) |
| `.mcp.json` | ✅ GitHub + Supabase MCP servers |
| `.claude/skills/<name>/SKILL.md` | ✅ `pdf-summarizer/SKILL.md` |
| `.claude/agents/<name>.md` | ✅ `code-reviewer.md` |
| 6 pitch slides | ✅ `slides/pitch.md` |
| report.md (this file) | ✅ |

---

*Built with Claude Code · Supabase · Claude API*
