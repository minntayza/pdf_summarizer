---
marp: true
theme: default
paginate: true
---

# Smart PDF Lecture Summarizer — Tech Stack

## Overview

Upload lecture PDFs → AI generates study materials: summaries, key exam points, flashcards, quizzes, and chat.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | HTML + CSS + Vanilla JavaScript (zero build step) |
| **Auth** | Supabase Auth (email/password) |
| **Backend** | Supabase Edge Functions (Deno/TypeScript) |
| **Database** | Supabase PostgreSQL (RLS + Full-Text Search) |
| **Storage** | Supabase Storage (private buckets: `pdfs`, `outputs`) |
| **PDF Parsing** | `pdf-parse` npm package |
| **AI** | Claude API (default) + Gemini API |
| **Hosting** | Vercel (static) + Supabase Cloud (backend) |
| **SDK** | `@supabase/supabase-js@2` via esm.sh importmap |

---

## Agents

**Code Reviewer Agent** (`.claude/agents/code-reviewer.md`)

- World-class senior engineer persona with security audit focus
- 5-pass review methodology: Intent → Security → Correctness → Performance → Error Handling
- Structured output: Critical / High / Medium / Low issues
- Persistent memory system that accumulates project knowledge across sessions
- Used proactively after writing significant code or before merging PRs

---

## Skills

**PDF Summarizer Skill** (`.claude/skills/pdf-summarizer/SKILL.md`)

- Documents the full project architecture, core workflow, and key configuration
- Guides Claude Code on how to navigate the codebase
- Covers: auth flow, upload flow, edge function processing, AI prompt structure
- Security model: RLS, storage policies, API key management
- Used whenever working on features, debugging, or troubleshooting the project

---

## Methodology

**Build → Review → Ship**

1. **Design first** — wrote `design.md` with architecture, data flow, security model
2. **Build iteratively** — frontend pages one at a time, edge functions with prompts
3. **Code review** — code-reviewer agent audits after each feature
4. **Test with real data** — uploaded actual lecture PDFs, verified outputs
5. **Ship via Vercel** — git push triggers automatic deployment
6. **Iterate based on feedback** — SRS, study rooms, search added post-launch

**Key principle:** Every feature starts with "what does the student need?" not "what's technically interesting?"

---

## Trigger / Commands

**Skill trigger:**
- Activates when working on any PDF Summarizer feature
- Automatic context loading for architecture and conventions

**Code Reviewer Agent:**
- **Trigger:** After writing/modifying significant code
- **Command:** `/agent code-reviewer` or "review this code"
- **When:** Before PRs, after refactors, security-sensitive changes

**MCP Tools:**
- **Supabase MCP** — direct database queries, migration management, edge function deployment
- **GitHub MCP** — PR creation, issue management, code search

---

## Commands

```bash
# Local development
cd frontend && python3 -m http.server 3000

# Deploy edge functions
npx supabase functions deploy process-pdf
npx supabase functions deploy chat-pdf

# Set API keys
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
npx supabase secrets set GEMINI_API_KEY=...

# Code review (in Claude Code)
# "Please review my code using the code-reviewer agent"
```

---

## Summary

| What | How |
|------|-----|
| **Frontend** | Vanilla HTML/CSS/JS — fast, no build step |
| **Backend** | Supabase Edge Functions — serverless Deno/TypeScript |
| **AI** | Claude API with structured prompts for study material generation |
| **Security** | RLS + JWT auth + private storage buckets |
| **Dev Flow** | Claude Code + Skills + Agents + MCP + Vercel auto-deploy |
| **Result** | Upload PDF → get complete study kit in seconds |
