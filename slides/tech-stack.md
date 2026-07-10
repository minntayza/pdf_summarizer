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
