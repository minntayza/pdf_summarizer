# Chapter 3 — Personal Project Report

**GitHub Username:** minntayza
**Project:** Smart PDF Lecture Summarizer
**Repo:** https://github.com/minntayza/pdf_summarizer
**Date:** 2026-06-19

---

## 1. Why I Built This

I'm a student in **Vibe Code Tours**. My lecturer **U Ko Ko Ye** shares lecture PDFs every week — each one is 30–60 pages of dense technical content. When exams approach, I end up with a pile of PDFs and very little time to review them all.

I needed a way to:
- **Summarize** each lecture quickly without reading 60 pages
- **Extract key points** — what's actually important for the exam
- **Create flashcards** — so I can actively test myself instead of just re-reading

So I built **Smart PDF Lecture Summarizer** — a web app where I upload U Ko Ko Ye's PDFs and AI generates summary notes, key exam points, and interactive flashcards. Everything is saved in the cloud so I can revisit any lecture anytime.

---

## 2. What I Built

Smart PDF Lecture Summarizer is a **full-stack web application** built entirely with Claude Code. I log in with email/password, upload U Ko Ko Ye's lecture PDFs, and within minutes receive structured study materials — all stored in Supabase cloud.

### From CLI to Web App

| Phase 1 | Phase 2 |
|---------|---------|
| CLI tool (Terminal) | Web app (Browser) |
| Local file storage | Supabase cloud storage |
| No user accounts | Email + password accounts |
| Python Flask | Supabase Edge Function (Deno/TS) |
| Single-use | Persistent library with history |

---

## 3. How Claude Code Helped

This project was built **entirely with Claude Code** as part of Vibe Code Tours. Here's how Claude Code contributed:

### Architecture & Design
- I started with a vision in `PROPOSAL.md` — Claude Code helped turn it into a full technical design (`design.md`)
- Claude Code designed the architecture: HTML/CSS/JS frontend served locally, Supabase cloud handling auth, storage, database, and edge functions
- Recommended the polling-based progress pattern instead of WebSockets (simpler, zero extra infrastructure)

### Frontend Development
- Built all 5 pages: login, signup, upload, library, view
- CSS dark theme with purple/green palette, mobile responsive
- Auth helpers, Supabase client setup, and shared utilities — all vanilla JS
- No frameworks, no build step, no complexity

### Backend Development
- Built the Supabase Edge Function in TypeScript/Deno:
  - `index.ts` — handles `POST /process-pdf` and `GET /status/:id`
  - `prompts.ts` — structured AI prompts for summary, key exam points, and flashcards
  - `extract.ts` — PDF text extraction using pdf-parse
- Set up database migrations with Row Level Security
- Configured Storage bucket policies so each user's files are private

### Agents, Skills & MCP
- **code-reviewer agent** — Caught bugs and security issues I would have missed
- **pdf-summarizer skill** — Custom project skill documenting the app for Claude Code
- **brainstorming skill** — Used during design phase to explore approaches
- **`.mcp.json`** — Configured GitHub and Supabase MCP servers at project level

---

## 4. Key Features

- ✅ Email + password signup/login (Supabase Auth)
- ✅ Drag & drop PDF upload (up to 25 MB)
- ✅ AI-powered **summary notes** from lecture PDFs
- ✅ **Key exam points** extraction — what's most likely on the test
- ✅ Interactive click-to-flip **flashcards** for active recall
- ✅ Persistent **library** with status badges (processing / done / error)
- ✅ Real-time progress bar during AI processing (polling-based)
- ✅ Row Level Security — each user sees only their own documents
- ✅ API keys stored server-side (Supabase secrets), never exposed to browser
- ✅ Mobile-responsive dark theme

---

## 5. Technical Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML + CSS + Vanilla JS |
| Auth | Supabase Auth (email/password) |
| Backend | Supabase Edge Functions (Deno/TypeScript) |
| Storage | Supabase Storage |
| Database | Supabase Postgres |
| PDF Parsing | pdf-parse (npm) |
| AI | Claude API |
| MCP | GitHub MCP + Supabase MCP |
| Dev Tools | Claude Code |

---

## 6. Challenges & How I Solved Them

### Challenge 1: Edge Function body size limits
**Problem:** Supabase Edge Functions have a 6 MB body limit, but U Ko Ko Ye's lecture PDFs can be 15–20+ MB.

**Solution:** Upload PDFs directly to Supabase Storage from the browser, then send only the storage path to the Edge Function. The Edge Function downloads the PDF internally — no body limit issues.

### Challenge 2: Processing large PDFs without timing out
**Problem:** A big PDF means lots of text. One AI call can't handle 100+ pages. Multiple calls risk hitting the Edge Function timeout.

**Solution:** Built a chunking system — the Edge Function splits text by page boundaries (60K characters per chunk), processes each chunk with Claude, then merges the results. Added a safety timeout (4 minutes) with a clear error message if it takes too long.

### Challenge 3: AI output sometimes not parseable
**Problem:** Claude occasionally returned responses that didn't parse correctly as structured output for the three sections.

**Solution:** Added retry logic — if parsing fails, retry once with a sharper prompt. If both attempts fail, surface a clear error to the user instead of crashing silently.

### Challenge 4: Progress feedback during long processing
**Problem:** AI processing takes 30 seconds to 3 minutes. Users need to know what's happening.

**Solution:** Polling pattern — the Edge Function writes progress to the database row (10% → 35% → 80% → 100%), and the frontend polls `GET /status/:id` every 1.5 seconds with a visual progress bar. No WebSocket server needed.

### Challenge 5: Keeping API keys secure in a browser app
**Problem:** Claude API key must never appear in client-side JavaScript.

**Solution:** All AI calls happen inside the Supabase Edge Function. The API key is stored as a Supabase secret and injected at runtime. The browser never touches it.

---

## 7. What I Learned

1. **Supabase is a complete backend** — Auth, storage, database, and serverless functions all in one platform. I didn't need a separate server, database host, or auth provider.

2. **Row Level Security matters from day one** — Writing correct RLS policies for every table and bucket ensures one user can never access another's files. It's not something you bolt on later.

3. **Polling works great for serverless** — WebSockets need persistent connections that don't fit the serverless model. Polling with database-backed status is dead simple and perfectly adequate for progress updates.

4. **Claude Code agents catch what you miss** — The code-reviewer agent flagged edge cases and error handling gaps I wouldn't have thought of. Skills keep the workflow disciplined.

5. **MCP servers extend Claude Code's reach** — GitHub MCP for repo management and Supabase MCP for database operations made the workflow feel seamless. Having them in `.mcp.json` means the setup is documented right in the repo.

6. **You don't need a framework** — Vanilla HTML, CSS, and JavaScript built a real, production-quality app. No React, no build tools, no bundlers needed.

---

## 8. Submission Checklist

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

*Built with Claude Code for Vibe Code Tours · Supabase · Claude API*
