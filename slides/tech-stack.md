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
