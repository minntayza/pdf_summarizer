---
marp: true
auto-advance: 20
---

# How We Built Smart PDF Lecture Summarizer

## Tech Stack 🔧

| Layer | Tech | Why |
|-------|------|-----|
| Markup | HTML5 | Semantic, zero dependencies |
| Styling | CSS3 (custom properties) | Swiss academic design, light/dark themes |
| Logic | Vanilla JS (ES modules) | No bundler, no transpiler — instant dev loop |
| Auth | Supabase Auth | Email + password, JWT client-side |
| i18n | Custom `data-i18n` | English + Myanmar/Burmese bilingual |
| Backend | Supabase Edge Functions (Deno) | Serverless, cold-start ~2s, free tier |
| PDF Parsing | `pdf-parse` (npm) | JS-native, runs inside Edge Function |
| AI Primary | Claude API (`claude-sonnet-4-6`) | Best reasoning for academic content |
| AI Fallback | Gemini API (`gemini-2.5-flash`) | Backup when Claude unavailable |
| Database | Supabase Postgres | RLS, full-text search, real-time |
| Storage | Supabase Storage | Private buckets, 25 MB PDFs, 10 MB outputs |
| Hosting | Vercel (frontend) + Supabase (backend) | Zero infra, auto-deploy from GitHub |

---

## Agents 🤖

**One custom agent: `code-reviewer`**

| Property | Value |
|----------|-------|
| File | `.claude/agents/code-reviewer.md` |
| Model | inherit (uses session model) |
| Memory | project-scoped |

**What it reviews:**
- Security vulnerabilities (XSS, injection, auth bypass)
- Correctness & logic errors (null handling, edge cases)
- Performance issues (O(n²), N+1 queries)
- Error handling gaps (swallowed exceptions)
- Architecture concerns (circular deps, missing idempotency)

**Review process:** 5-pass methodology — Intent → Security → Correctness → Performance → Error surface

---

## Skills 🛠️

**One custom skill: `pdf-summarizer`**

| Property | Value |
|----------|-------|
| File | `.claude/skills/pdf-summarizer/SKILL.md` |
| Scope | Full-stack PDF processing workflow |

**When Claude uses it:**
- User uploads a lecture PDF → AI generates study materials
- User reviews past documents from Library
- User needs to troubleshoot Supabase backend
- User wants to modify AI prompts
- User needs to add/update frontend pages

**What it knows:**
- Full project structure and architecture
- Core workflow (auth → upload → process → poll → view)
- All environment variables and secrets
- AI prompt structure (summary, key points, flashcards)
- Security patterns (RLS, JWT, private storage)

---

## Methodology 📋

**How we work with Claude Code:**

| Step | What Happens |
|------|-------------|
| 1. **Plan first** | `EnterPlanMode` — explore codebase, design approach, get approval |
| 2. **Implement** | Write code following existing patterns (ES modules, Marp slides) |
| 3. **Review** | Invoke `code-reviewer` agent for security + correctness audit |
| 4. **Verify** | Check RLS policies, test edge cases, confirm deploy works |
| 5. **Document** | Update CLAUDE.md, slides, design docs |

**Key principles:**
- No build step — `python3 -m http.server 3000` and done
- RLS on every table — users see only their own data
- Idempotent migrations — `IF NOT EXISTS`, `DROP POLICY IF EXISTS`
- Secrets never reach the client — API keys in Supabase Secrets only

---

## Trigger ⚡

**When does Claude Code activate for this project?**

| Trigger | Action |
|---------|--------|
| `/pdf-summarizer` | Load the full skill context into conversation |
| `code-reviewer` agent | Spawned after significant code changes |
| `CLAUDE.md` | Auto-loaded on every session — project overview + conventions |
| `settings.local.json` | Permissions + enabled plugins loaded automatically |
| MCP servers | `github` + `supabase` connected on session start |

**Session startup flow:**
```
Claude Code starts
  → reads CLAUDE.md (project context)
  → loads settings.local.json (permissions)
  → connects MCP servers (GitHub + Supabase)
  → ready to work
```

---

## Commands 🖥️

**Common commands used in development:**

| Command | Purpose |
|---------|---------|
| `python3 -m http.server 3000` | Serve frontend locally |
| `npx supabase functions deploy process-pdf` | Deploy edge function |
| `npx supabase functions deploy chat-pdf` | Deploy chat function |
| `npx supabase secrets set ANTHROPIC_API_KEY=...` | Set API key |
| `git add . && git commit -m "..."` | Save changes |
| `git push` | Deploy to Vercel (auto) |

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
