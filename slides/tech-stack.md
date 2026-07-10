# Tech Stack — AI Health Report Explainer (PDF Summarizer)

---

## Slide 1: Project Overview

**What:** AI-powered web app that explains medical lab report PDFs in simple language
**For:** Elderly users and their families who struggle to understand health screening results
**Live:** [pdf-summarizer-topaz.vercel.app](https://pdf-summarizer-topaz.vercel.app)

---

## Slide 2: Tech Stack

| Layer | Technology | Why |
|---|---|---|
| Frontend | Vanilla JS + HTML/CSS | Simple, no build step, fast deploy |
| Hosting (FE) | Vercel | Auto-deploy from GitHub, edge network |
| Backend | Supabase Edge Functions | Deno runtime, close to DB, no cold-start hassle |
| Database | Supabase (PostgreSQL) | Auth + DB + storage in one, generous free tier |
| AI Engine | Claude API | Strong at structured medical explanation |
| PDF Parsing | pdf-parse | Extract text from uploaded PDF files |

---

## Slide 3: Data Flow

```
User uploads PDF
       ↓
Vercel serves frontend (static)
       ↓
Edge Function receives file
       ↓
pdf-parse extracts text
       ↓
Claude API generates structured summary
       ↓
Response: risk levels, explanations, food/lifestyle tips
       ↓
User sees summary in browser
```

---

## Slide 4: AI Agents & Skills

### Skill — pdf-summarizer
- **Path:** `.claude/skills/pdf-summarizer/SKILL.md`
- **Purpose:** Documents full project architecture, core workflow, AI prompt structure, and security model
- **Use:** Claude Code reads this to understand the project when debugging or adding features

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

- **AI-assisted full-stack development** using Claude Code as the primary coding tool
- **Iterative feature development** — build → test → user feedback → refine
- **Supabase MCP** for direct DB queries, migrations, and secret management during dev
- **Context7** for up-to-date docs on Supabase Edge Functions, Deno, and JS patterns
- **User-centered design** — real user interview shaped the feature roadmap

---

## Slide 6: Triggers & Commands

| Tool | Trigger | Command |
|---|---|---|
| pdf-summarizer skill | Working on any feature or debugging | "Help me with the upload flow", "Debug the edge function" |
| brainstorming skill | Exploring new features or refining design | "Brainstorm improvements", "Review this feature spec" |
| code-reviewer agent | Before PRs, after refactors, security-sensitive changes | "Review the code using the code-reviewer agent" |

---

## Slide 7: Key Features (from User Feedback)

- Drag-and-drop PDF upload
- AI-generated summary grouped by risk level
- Plain-language medical explanations
- Food & lifestyle recommendations
- Reference ranges next to lab values *(from feedback)*
- Image/photo upload support *(planned)*
- Export/download summary as PDF *(planned)*
