# Smart PDF Lecture Summarizer — Pitch Deck (6 Slides × 20s)

---

## Slide 1: The Problem 🎓

**Too many lecture PDFs. Not enough time.**

Final exams are coming. Your professors dumped 30+ lecture PDFs on you. Each one is 50+ pages of dense academic text. You need to extract what actually matters — fast.

- 📚 Burmese university students receive piles of PDF lectures before exams
- ⏰ Manual note-taking takes hours per lecture
- 😵 Hard to identify which topics are most exam-relevant
- 🔁 No easy way to review past lectures and test yourself

**The question:** What if you could upload a PDF and get summary notes, exam key points, and flashcards in minutes?

---

## Slide 2: The Solution 💡

**Smart PDF Lecture Summarizer**

A web app where students log in, upload lecture PDFs, and AI generates everything they need to study:

```
Upload PDF  →  AI Processing  →  Your Study Materials
                              ├─ 📝 Summary Notes
                              ├─ 🎯 Key Exam Points
                              └─ 🃏 Interactive Flashcards
```

- 🌐 **Web-based** — nothing to install, works in any browser
- ☁️ **Cloud storage** — your documents follow you across devices
- 👤 **Personal account** — your own private library of processed lectures
- 🤖 **AI-powered** — Claude or Gemini generates the study materials

---

## Slide 3: Architecture 🏗️

**Frontend talks to Supabase. Supabase handles everything else.**

```
    Browser (localhost:3000)             Supabase Cloud
   ┌─────────────────────┐        ┌──────────────────────┐
   │  Login / Signup      │───JWT──│  Supabase Auth        │
   │  Upload PDF          │───Storage──│  Supabase Storage      │
   │  Library (History)   │───DB──────│  Supabase Postgres     │
   │  View Results        │───EdgeFn─│  Edge: process-pdf     │
   └─────────────────────┘        │       ↓                │
                                   │  Claude / Gemini API   │
                                   └──────────────────────┘
```

**Flow:**
1. User uploads PDF → Supabase Storage
2. Edge Function triggered → extracts text with pdf-parse
3. Text sent to Claude/Gemini → structured prompts
4. Output .md files saved → Status updated in DB
5. Frontend polls for progress → Results displayed

---

## Slide 4: Key Features ✨

**Everything a student needs to study smarter.**

| Feature | Description |
|---------|-------------|
| 🔐 **User Accounts** | Email + password signup/login via Supabase Auth |
| 📤 **Drag & Drop Upload** | Simple PDF upload, max 25 MB |
| 📝 **AI Summaries** | Well-organized lecture notes with headings & key concepts |
| 🎯 **Exam Points** | Critical topics most likely to appear on exams |
| 🃏 **Flashcards** | Click-to-flip Q&A cards for active recall |
| 📚 **Library** | All past uploads saved with status badges |
| 🔒 **Private** | RLS ensures each user sees only their own files |
| 🌙 **Dark Theme** | Purple/green dark mode, mobile responsive |

---

## Slide 5: Tech Stack 🔧

**No frameworks. No build step. Just the essentials.**

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | HTML + CSS + Vanilla JS | Zero build step, served locally |
| Auth | Supabase Auth | Email/password, JWT-based |
| Backend | Supabase Edge Functions | Deno/TypeScript, serverless |
| Database | Supabase Postgres | RLS for row-level security |
| Storage | Supabase Storage | Private per-user folders |
| PDF Parsing | pdf-parse (npm) | JS-native, runs in Edge Function |
| AI | Claude API + Gemini API | Keys in Supabase secrets |
| MCP | GitHub + Supabase | Claude Code integration via .mcp.json |

---

## Slide 6: Built with Claude Code 🤖

**This entire project was built using Claude Code.**

**Claude Code helped with:**
- 🎨 Designing the full architecture from PROPOSAL.md to working app
- 💻 Writing all frontend pages (login, signup, upload, library, view)
- ⚡ Building the Supabase Edge Function with Deno/TypeScript
- 🗄️ Setting up database schema, RLS policies, and storage buckets
- 🐛 Debugging and code review via the code-reviewer agent
- 📦 Project-level MCP configuration for GitHub + Supabase

**What I learned:**
- How to build a full-stack serverless app with Supabase
- Using Claude Code's agents and skills system
- MCP servers for GitHub and Supabase integration
- Row Level Security patterns for multi-tenant data

**Repo:** [github.com/minntayza/pdf_summarizer](https://github.com/minntayza/pdf_summarizer) ⭐
