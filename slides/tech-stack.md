---
marp: true
auto-advance: 20
---

# Tech Stack — Smart PDF Lecture Summarizer

## Frontend

| Layer | Tech | Why |
|-------|------|-----|
| Markup | HTML5 | Semantic, zero dependencies |
| Styling | CSS3 (custom properties) | Swiss academic design, light/dark themes |
| Logic | Vanilla JS (ES modules) | No bundler, no transpiler — instant dev loop |
| Auth UI | Supabase Auth helpers | Email + password, JWT stored client-side |
| i18n | Custom `data-i18n` system | English + Myanmar/Burmese bilingual |

---

## Backend

| Layer | Tech | Why |
|-------|------|-----|
| Runtime | Supabase Edge Functions (Deno/TypeScript) | Serverless, cold-start ~2s, free tier generous |
| PDF Parsing | `pdf-parse` (npm) | JS-native, runs inside Edge Function |
| AI — Primary | Claude API (`claude-sonnet-4-6`) | Best reasoning for academic content |
| AI — Fallback | Gemini API (`gemini-2.5-flash`) | Backup when Claude unavailable |
| Proxy | Custom proxy (optional) | Routes around regional API restrictions |

---

## Data & Storage

| Layer | Tech | Why |
|-------|------|-----|
| Database | Supabase Postgres | RLS policies, full-text search, real-time |
| Auth | Supabase Auth | Built-in JWT, row-level security integration |
| File Storage | Supabase Storage | Private buckets, 25 MB PDFs, 10 MB outputs |
| Search | PostgreSQL FTS (tsvector + GIN) | Fast server-side search, no external service |

---

## Infrastructure & DevOps

| Layer | Tech | Why |
|-------|------|-----|
| Hosting (frontend) | Vercel | Static site, auto-deploy from GitHub |
| Hosting (backend) | Supabase Cloud | Managed Deno runtime |
| CI/CD | GitHub Actions (via Claude Code) | Automated edge function deploys |
| Secrets | Supabase Secrets | API keys never reach the client |
| Version Control | Git + GitHub | PRs, branches, handoff docs |

---

## Processing Flow

```
Browser                 Supabase Cloud              External
───────                 ──────────────              ────────
Login ────────────▶ Auth (JWT)
Upload PDF ───────▶ Storage (direct)
POST /process-pdf ─▶ Edge Function
                       │
                       ├─ pdf-parse ──▶ text extraction
                       ├─ Claude API ──▶ summary + key points + flashcards
                       └─ Storage ◀──── write .md outputs
Library ◀───────── DB (documents table)
View ◀──────────── Storage (.md files)
```

---

## Why This Stack

| Decision | Reasoning |
|----------|-----------|
| **No build step** | `python3 -m http.server 3000` and done |
| **Supabase over Firebase** | Open-source, Postgres-native, better free tier |
| **Edge Functions over traditional server** | Zero infra management, scales to zero |
| **Vanilla JS over React** | No node_modules bloat, instant page loads |
| **Claude over GPT** | Stronger academic reasoning, better structured output |
| **pdf-parse over PyMuPDF** | Runs in same Deno runtime, no Python dependency |

---

## Cost Breakdown (Free Tier)

| Service | Free Limit | Our Usage |
|---------|-----------|-----------|
| Supabase DB | 500 MB | ~10 MB (thousands of docs) |
| Supabase Storage | 1 GB | ~200 MB (PDFs + outputs) |
| Edge Functions | 500K invocations/mo | ~1K (personal use) |
| Claude API | Pay-per-token | ~$0.02–0.10 per PDF |
| Vercel | 100 GB bandwidth | Static files, minimal |

**Total: ~$0/month for personal use**
# Tech Stack — Smart PDF Lecture Summarizer

---

## Slide 1: Project Overview

**What:** AI-powered web app that turns lecture PDFs into study materials — summaries, key exam points, flashcards, and quizzes
**For:** University students preparing for exams
**Live:** [pdf-summarizer-topaz.vercel.app](https://pdf-summarizer-topaz.vercel.app)

---

## Slide 2: Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Vanilla JS + HTML/CSS | No build step, fast deploy |
| Hosting (FE) | Vercel | Auto-deploy from GitHub, edge network |
| Backend | Supabase Edge Functions | Deno runtime, close to DB, serverless |
| Database | Supabase (PostgreSQL) | Auth + DB + Storage + Full-text search |
| AI Engine | Claude API / Gemini | PDF analysis, summary, flashcard generation |
| PDF Parsing | pdf-parse | Extract text from uploaded PDFs |

---

## Slide 3: Data Flow

```
User uploads lecture PDF
       ↓
Supabase Storage (up to 25 MB)
       ↓
Edge Function: process-pdf
       ↓
pdf-parse extracts text
       ↓
Claude / Gemini generates study kit
  ├─ Summary notes
  ├─ Key exam points
  ├─ Flashcards (Q&A)
  └─ Quiz questions
       ↓
Saved to PostgreSQL
       ↓
User views in browser (library + results)
```

---

## Slide 4: AI Agents & Skills

### Skill — pdf-summarizer
- **Path:** `.claude/skills/pdf-summarizer/SKILL.md`
- **Purpose:** Documents project architecture, AI prompt structure, and core workflow
- **Use:** Claude Code reads this to understand the project when adding features or debugging

### Skill — brainstorming
- **Path:** `.agents/skills/brainstorming/SKILL.md`
- **Purpose:** Structured ideation, spec review, design exploration
- **Use:** Refining feature ideas before implementation

### Subagent — code-reviewer
- **Path:** `.claude/agents/code-reviewer.md`
- **Purpose:** 5-pass code review (Intent → Security → Correctness → Performance → Error Handling)
- **Use:** Review code before PRs, audit edge functions for security

---

## Slide 5: Methodology

- **AI-assisted full-stack development** — Claude Code as primary coding tool
- **Iterative feature development** — build → test → user feedback → refine
- **Supabase MCP** for direct DB queries, migrations, and secret management
- **Context7** for up-to-date docs on Supabase Edge Functions, Deno, and JS patterns
- **User-centered design** — real user interview shaped the feature roadmap

---

## Slide 6: Triggers & Commands

| Tool | Trigger | Command |
|---|---|---|
| pdf-summarizer skill | Working on any feature or debugging | "Help me with the upload flow", "Debug the edge function" |
| brainstorming skill | Exploring new features or refining design | "Brainstorm improvements", "Review this feature spec" |
| code-reviewer agent | Before PRs, after refactors, security changes | "Review the code using the code-reviewer agent" |

---

## Slide 7: Key Features

- Drag-and-drop PDF upload (up to 25 MB)
- AI-generated summary notes with headings & key concepts
- Key exam points — critical topics most likely on exams
- Interactive flashcards with click-to-flip
- Spaced repetition review (SM-2 algorithm)
- Auto-graded quiz mode
- Smart library with full-text search
- 6 output languages supported
