---
marp: true
auto-advance: 20
---

# Smart PDF Lecture Summarizer — 6×20 Pitch Deck

## The Problem 🎓

**Lecture PDFs are long. Exam prep takes too much time.**

Lecture PDFs are dense — 30 to 60 pages each. Before exams, reading through every page and manually taking notes isn't practical.

---

## Slide 2: The Solution 💡

**Smart PDF Lecture Summarizer**

Upload a lecture PDF and AI generates everything needed to study:

```
Upload PDF  →  AI Processing  →  Study Materials
                              ├─ 📝 Summary Notes
                              ├─ 🎯 Key Exam Points
                              └─ 🃏 Interactive Flashcards
```

---

## Slide 3: Architecture 🏗️

**Frontend talks to Supabase. Supabase handles everything.**

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

1. Upload PDF → Supabase Storage
2. Edge Function extracts text → sends to Claude
3. Claude generates summary, key points, flashcards
4. Output saved → results shown in browser

---

## Slide 4: Key Features ✨

| Feature | Description |
|---------|-------------|
| 📤 **Drag & Drop Upload** | Upload any lecture PDF, up to 25 MB |
| 📝 **AI Summary** | Organized lecture notes with headings & key concepts |
| 🎯 **Key Points** | Critical topics most likely on the exam |
| 🃏 **Flashcards** | Click-to-flip Q&A cards for active recall |
| 📚 **Library** | All past uploads saved, revisit anytime |
| 🔒 **Private** | Each user sees only their own documents |
| 🔐 **User Accounts** | Email + password via Supabase Auth |

---

## Slide 5: Tech Stack 🔧

| Layer | Technology |
|-------|-----------|
| Frontend | HTML + CSS + Vanilla JS |
| Auth | Supabase Auth |
| Backend | Supabase Edge Functions (Deno/TypeScript) |
| Database | Supabase Postgres |
| Storage | Supabase Storage |
| PDF Parsing | pdf-parse (npm) |
| AI | Claude API |
| MCP | GitHub + Supabase |

---

## Slide 6: Built with Claude Code 🤖

Built entirely with Claude Code — architecture, frontend, backend, and MCP integration.

**Claude Code helped with:**
- Full app design and architecture
- All frontend pages and styling
- Supabase Edge Function with PDF chunking
- Database schema, RLS, and storage policies
- Code review and debugging
- MCP configuration for GitHub + Supabase

**Repo:** [github.com/minntayza/pdf_summarizer](https://github.com/minntayza/pdf_summarizer)
