---
name: pdf-summarizer
description: "Process lecture PDFs into AI-generated study materials — summary notes, key exam points, and interactive Q&A flashcards. Uses Claude/Gemini for AI generation and Supabase for cloud storage, auth, and database."
---

# PDF Summarizer — Smart Lecture to Study Materials

Turn academic lecture PDFs into structured study materials: **summary notes**, **key exam points**, and **interactive flashcards** — powered by AI with persistent cloud storage via Supabase.

## When to Use This Skill

Use this skill when:
- A user uploads a lecture PDF and wants AI-generated study materials
- A user wants to review previously processed documents from their Library
- A user needs to set up or troubleshoot the Supabase backend (auth, storage, edge functions)
- A user wants to modify the AI prompts for better output quality
- A user needs to add or update frontend pages (upload, library, view, auth)

## Architecture

```
Frontend (HTML/CSS/JS)          Supabase Cloud
┌──────────────────┐       ┌─────────────────────────┐
│ Login / Signup    │──JWT──│ Supabase Auth            │
│ Upload PDF        │──Storage──│ Supabase Storage      │
│ Library (history) │──DB──────│ Supabase Postgres      │
│ View Results      │──EdgeFn──│ Edge: process-pdf      │
└──────────────────┘       └─────────────────────────┘
```

## Core Workflow

1. **Auth** — User signs up / logs in with email + password (Supabase Auth)
2. **Upload** — PDF is uploaded directly to Supabase Storage (bypasses Edge Function body limits)
3. **Process** — `POST /process-pdf` triggers the Edge Function, which:
   - Downloads the PDF from Storage
   - Extracts text using `pdf-parse`
   - Sends text to Claude/Gemini with structured prompts
   - Saves output `.md` files back to Storage
   - Updates the `documents` database row with status
4. **Poll** — Frontend polls `GET /status/:id` for real-time progress updates
5. **View** — Results displayed in browser: Summary tab, Key Points tab, Flashcards tab
6. **Library** — All past uploads shown in reverse chronological order with status badges

## Project Structure

```
smart_pdf_lecture_summarizer/
├── frontend/                    # Static HTML/CSS/JS (served locally)
│   ├── index.html               # Login page
│   ├── signup.html              # Signup page
│   ├── upload.html              # Upload + process
│   ├── library.html             # Past documents
│   ├── view.html                # View outputs
│   ├── css/style.css            # Dark theme (purple/green)
│   └── js/
│       ├── supabase-client.js   # Supabase SDK init
│       ├── auth.js              # Auth helpers
│       └── app.js               # Shared utilities
├── supabase/
│   ├── functions/process-pdf/   # Edge Function (Deno/TypeScript)
│   │   ├── index.ts             # Main handler
│   │   ├── prompts.ts           # AI prompt templates
│   │   ├── extract.ts           # PDF text extraction
│   │   └── deno.json            # Deno imports
│   └── migrations/
│       └── 001_create_documents_table.sql
├── .mcp.json                    # MCP configuration (GitHub + Supabase)
├── .claude/
│   ├── agents/code-reviewer.md  # Code review agent
│   └── skills/pdf-summarizer/   # This skill
├── design.md                    # Technical design
├── PROPOSAL.md                  # Vision & scope
└── README.md
```

## Key Configuration

### Environment Variables & Secrets

| Variable | Location | Purpose |
|----------|----------|---------|
| `ANTHROPIC_API_KEY` | Supabase Secrets | Claude API access |
| `GEMINI_API_KEY` | Supabase Secrets | Gemini API access |
| `SUPABASE_ACCESS_TOKEN` | Shell env / MCP | Supabase management API |
| `GITHUB_TOKEN` | Shell env / MCP | GitHub API access |

### Setting Supabase Secrets

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase secrets set GEMINI_API_KEY=...
```

## AI Prompts

The Edge Function uses structured prompts (in `supabase/functions/process-pdf/prompts.ts`) to generate three outputs:

1. **Comprehensive Summary** — Well-organized lecture notes with headings, bullet points, and key concepts
2. **Key Exam Points** — Critical topics likely to appear on exams, with brief explanations
3. **Flashcards** — Q&A pairs in a parseable format for interactive flip-card rendering

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML + CSS + Vanilla JS |
| Auth | Supabase Auth (email/password) |
| Backend | Supabase Edge Function (Deno/TypeScript) |
| Storage | Supabase Storage |
| Database | Supabase Postgres |
| PDF Parsing | pdf-parse (npm) |
| AI | Claude API / Gemini API |

## Security

- AI provider API keys stored as Supabase secrets — never exposed to browser
- JWT-based authentication via Supabase Auth
- Row Level Security (RLS) on database: users see only their own documents
- Storage RLS: users access only files in their `{user_id}/` folder
- PDFs uploaded directly to Storage, bypassing Edge Function body size limits
