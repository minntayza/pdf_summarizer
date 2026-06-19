# Smart PDF Lecture Summarizer — Pitch Deck (6 Slides × 20s)

---

## Slide 1: The Problem 🎓

**U Ko Ko Ye gives us a lot of lecture PDFs. Exam is coming.**

I'm a student in Vibe Code Tours. Every week, U Ko Ko Ye uploads lecture PDFs — dense, technical content spanning 30–60 pages each. Before exams, I have a pile of these PDFs to go through.

- 📚 U Ko Ko Ye's lectures are comprehensive but long — hard to review quickly
- ⏰ Manually taking notes from each PDF takes hours
- 🎯 I need to know what the **key points** are — what's most likely on the exam
- 🃏 I want **flashcards** to test myself, not just re-read text
- 🔁 I need to revisit past lectures anytime, not dig through my downloads folder

**The question:** What if I could just upload U Ko Ko Ye's PDF and get summary, key points, and flashcards in minutes?

---

## Slide 2: The Solution 💡

**Smart PDF Lecture Summarizer**

A web app I built for myself during Vibe Code Tours. I log in, upload U Ko Ko Ye's lecture PDFs, and AI generates everything I need to study:

```
Upload U Ko Ko Ye's PDF  →  AI Processing  →  My Study Materials
                                            ├─ 📝 Summary Notes
                                            ├─ 🎯 Key Exam Points
                                            └─ 🃏 Interactive Flashcards
```

- 🌐 **Web-based** — open in my browser, nothing to install
- ☁️ **Cloud storage** — my study materials follow me across devices
- 👤 **My own account** — private library of all processed lectures
- 🤖 **AI-powered** — Claude generates Burmese-friendly study materials

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
                                   │  Claude API            │
                                   └──────────────────────┘
```

**Flow:**
1. I upload U Ko Ko Ye's PDF → Supabase Storage
2. Edge Function triggered → extracts text with pdf-parse
3. Text sent to Claude → structured prompts for summary, key points, flashcards
4. Output .md files saved → Status updated in DB
5. Frontend polls for progress → Results displayed

---

## Slide 4: Key Features ✨

**Everything I need to study U Ko Ko Ye's lectures smarter.**

| Feature | Description |
|---------|-------------|
| 🔐 **My Account** | Email + password login via Supabase Auth |
| 📤 **Drag & Drop** | Upload U Ko Ko Ye's PDF — simple, up to 25 MB |
| 📝 **AI Summary** | Well-organized lecture notes from the PDF content |
| 🎯 **Key Points** | Extracts the most important exam-relevant topics |
| 🃏 **Flashcards** | Click-to-flip Q&A cards for active recall |
| 📚 **Library** | All past lectures saved — revisit anytime |
| 🔒 **Private** | Only I can see my uploaded lectures |
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
| AI | Claude API | Keys in Supabase secrets |
| MCP | GitHub + Supabase | Claude Code integration via .mcp.json |

---

## Slide 6: Built with Claude Code 🤖

**This entire project was built using Claude Code during Vibe Code Tours.**

**Claude Code helped me:**
- 🎨 Design the architecture — from idea to working app
- 💻 Build all 5 frontend pages (login, signup, upload, library, view)
- ⚡ Write the Supabase Edge Function with chunking for large PDFs
- 🗄️ Set up database schema, RLS policies, and storage buckets
- 🐛 Debug and review code via the code-reviewer agent
- 📦 Configure project-level MCP servers (GitHub + Supabase)

**What I learned from Vibe Code Tours:**
- How to build a full-stack serverless app with Supabase
- Using Claude Code's agents, skills, and MCP servers
- Polling-based progress for serverless (no WebSocket infra needed)
- Row Level Security for keeping user data private

**Repo:** [github.com/minntayza/pdf_summarizer](https://github.com/minntayza/pdf_summarizer) ⭐
