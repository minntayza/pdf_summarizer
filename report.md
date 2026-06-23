# Chapter 3 — Personal Project Report

**GitHub Username:** minntayza
**Project:** Smart PDF Lecture Summarizer
**Repo:** https://github.com/minntayza/pdf_summarizer
**Date:** 2026-06-19

---

## 1. What I Built

A web app that turns lecture PDFs into **summary notes**, **key exam points**, and **interactive flashcards** using AI. Built with Claude Code as part of Vibe Code Tours.

---

## 2. How It Works

1. Log in with email/password (Supabase Auth)
2. Upload a PDF via drag & drop
3. Edge Function extracts text → sends to Claude API
4. Claude generates summary, key points, and flashcards
5. Results displayed in browser, saved to cloud storage
6. All past uploads available in the Library

---

## 3. Architecture

```
Frontend (HTML/CSS/JS)           Supabase Cloud
       ↕                              ↕
  localhost:3000              Auth · Storage · DB · Edge Functions
                                        ↕
                                   Claude API
```

The frontend is static HTML/CSS/JS served locally. Supabase handles auth, storage, database, and serverless edge functions. AI processing runs in the Edge Function so API keys stay server-side.

---

## 4. Features

- Drag & drop PDF upload (up to 25 MB)
- AI-generated summary, key exam points, and flashcards
- Interactive click-to-flip flashcards
- Library with all past uploads and status badges
- Real-time progress bar during AI processing (polling-based)
- User accounts with Row Level Security — each user sees only their own files
- Dark theme, mobile responsive

---

## 5. Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML + CSS + Vanilla JS |
| Auth | Supabase Auth |
| Backend | Supabase Edge Functions (Deno/TypeScript) |
| Database | Supabase Postgres |
| Storage | Supabase Storage |
| PDF Parsing | pdf-parse |
| AI | Claude API |
| MCP | GitHub + Supabase |

---

## 6. Challenges & Solutions

| Challenge | Solution |
|-----------|----------|
| Edge Function has 6 MB body limit but PDFs can be 20+ MB | Upload PDFs directly to Storage first, send only the path to the Edge Function |
| Large PDFs timeout during AI processing | Chunk text by page boundaries (60K chars each), process sequentially with retry |
| AI output is not always parseable | Retry once with a sharper prompt, surface clear errors to user |
| Users need feedback during long processing | Polling pattern — Edge Function writes progress to DB, frontend polls every 1.5s |
| API keys must stay secure | All AI calls happen server-side in Edge Function, keys stored as Supabase secrets |

**Vision mode:** The Edge Function sends the full PDF (base64-encoded) to the AI API — Claude via `@anthropic-ai/sdk` document attachment, Gemini via `inlineData`. The AI sees text, diagrams, figures, charts, and tables together. The extracted text is also sent as supplementary context. This handles text-heavy lectures, mixed text+diagram PDFs, engineering schematics, and chemistry diagrams. Only pure image/scanned PDFs (no extractable text at all) remain unsupported.

---

## 7. What I Learned

- Supabase provides a complete backend — auth, storage, database, edge functions
- Row Level Security keeps multi-tenant data private
- Polling works well for serverless progress updates (no WebSocket infra needed)
- Claude Code agents and skills make development faster and more disciplined
- MCP servers (GitHub + Supabase) integrate Claude Code directly with external tools
- Vanilla HTML/CSS/JS can build a real, production-quality app

---

## 8. Submission Checklist

| Requirement | Status |
|-------------|--------|
| Public GitHub repo | ✅ `github.com/minntayza/pdf_summarizer` |
| Built with Claude Code | ✅ |
| 3 stars ⭐⭐⭐ | ⬜ Pending |
| `.mcp.json` | ✅ |
| `.claude/skills/<name>/SKILL.md` | ✅ `pdf-summarizer/SKILL.md` |
| `.claude/agents/<name>.md` | ✅ `code-reviewer.md` |
| 6 pitch slides | ✅ `slides/pitch.md` |
| report.md | ✅ |

---

*Built with Claude Code · Supabase · Claude API*
