# Smart PDF Lecture Summarizer — Proposal (Phase 2) by @minntayza

## Gist
အဆင့် ၂ အနေနဲ့ — ကျောင်းသား/သူများအတွက် **account ဖွင့်နိုင်သည့် web application** တစ်ခုတည်ဆောက်ရန်။ PDF lecture file များကို upload လုပ်ပြီး AI သုံး၍ summary, key exam points နှင့် flashcards များ generate လုပ်နိုင်မည်။ output အားလုံးကို supabase cloud storage တွင် သိမ်းဆည်းထားပြီး web app ထဲတွင် အချိန်မရွေးပြန်ဖတ်နိုင်မည်။

## What Changed from Phase 1
Phase 1 မှာ command-line tool အဖြစ် run ရပြီး local machine မှာသာ file သိမ်းနိုင်ခဲ့သည်။ Phase 2 မှာ:

- ~~Terminal / CLI~~ → **Web App** (browser ထဲက အသုံးပြုနိုင်)
- ~~Local file storage~~ → **Supabase cloud storage** (ဘယ်နေရာကမဆို access လို့ရ)
- ~~No accounts~~ → **Email + password accounts** (ကိုယ်ပိုင် account ဖြင့် login)
- ~~Python Flask~~ → **Supabase Edge Function** (TypeScript/Deno)
- ~~PyMuPDF~~ → **pdf-parse (JS)** (same browser/Deno runtime)

## Real User
**@minntayza** — ကျောင်းသားတစ်ဦးအနေဖြင့် စာမေးပွဲနီးလာတိုင်း ဆရာများက PDF ဖိုင်အများကြီးပေးအပ်ပြီး ၎င်းတို့ကို အချိန်တိုအတွင်း မှတ်မိလွယ်အောင်ပြင်ဆင်လိုသူ။ **ကိုယ်ပိုင် account** ဖွင့်ထားပြီး ယခင်က process လုပ်ခဲ့သော file များကို ပြန်လည်ဖတ်ရှုနိုင်ရန် လိုအပ်။

## Story
Aung Aung က စာမေးပွဲနီးနေချိန်မှာ သူ့ရဲ့ Smart PDF Lecture Summarizer web app ကို ဖွင့်လိုက်တယ်။ Email နဲ့ password login လုပ်လိုက်ရုံနဲ့ သူ အရင်အပတ်က upload လုပ်ခဲ့တဲ့ lecture တွေအားလုံးကို Library ထဲမှာ တွေ့လိုက်ရတယ်။ အသစ် lecture တစ်ခု upload လုပ်ချင်ရင်လည်း PDF file တစ်ခုကို drag & drop လုပ်ပြီး Analyze နှိပ်လိုက်ရုံပဲ။ မိနစ်ပိုင်းအတွင်း summary notes, exam key points နဲ့ flashcards တွေ generate လုပ်ပေးတယ်။ အရင်က CLI မှာ command ရိုက်နေစရာမလိုတော့ဘူး — browser ထဲမှာတင် အားလုံးလုပ်လို့ရသွားပြီ။

## Why
- **Easy to use** — Login လုပ် → Upload → ဖတ်။ Command line မသုံးတတ်သူတွေလည်း သုံးနိုင်
- **Anywhere access** — Supabase cloud မှာ file တွေသိမ်းထားလို့ laptop ပြောင်းရင်လည်း account login လုပ်ရုံနဲ့ data အားလုံးပြန်ရ
- **Persistent history** — လွန်ခဲ့တဲ့အပတ်က တင်ခဲ့တဲ့ lecture တွေကို ပြန်ဖတ်လို့ရ
- **Clean architecture** — Supabase က auth, storage, database, serverless functions အားလုံး တစ်နေရာတည်းမှာ handle လုပ်ပေး

## Why Not
- PDF ဖိုင်ထဲတွင် ပါဝင်သော **ရုပ်ပုံများ (Images/Diagrams) ကို AI မှ မြင်နိုင်ပါသည်** — Edge Function က PDF ကို base64 အဖြစ် Claude/Gemini Vision API သို့ တိုက်ရိုက်ပို့ပြီး AI က text, figures, diagrams, charts အားလုံးကို တစ်ပြိုင်တည်း ခွဲခြမ်းစိတ်ဖြာပါသည်။
- Meeting transcripts, video/audio ဖိုင်များကို လက်ခံမည်မဟုတ်ပါ။ (Academic PDF lectures ကိုသာ focus)
- Multi-user collaboration (sharing, groups) — Phase 3+ တွင် ထည့်သွင်းစဉ်းစားမည်
- Mobile app (iOS/Android) — Web app က mobile-responsive ဖြစ်အောင် CSS ဖြင့် ဖြေရှင်းမည်။
- Offline mode — အင်တာနက်ရှိမှ အလုပ်လုပ်မည်။

## Tech Spec

### Stack
| Layer | Technology | Notes |
|-------|-----------|-------|
| Frontend | HTML + CSS + Vanilla JS | Zero build step, served locally |
| Auth | Supabase Auth | Email + password signup/login |
| Backend API | Supabase Edge Functions (Deno/TS) | `POST /process-pdf` + `GET /status/:id` (polling-based) |
| Storage | Supabase Storage | PDFs + .md output files, private per user |
| Database | Supabase Postgres | `documents` table with RLS |
| PDF Parsing | pdf-parse (npm) | JS-native, runs in Edge Function |
| AI | Claude API + Gemini API | Keys stored in Supabase secrets |

### Architecture

```
Frontend (localhost)         Supabase Cloud
┌──────────────┐        ┌──────────────────────┐
│ Login/Signup │────JWT─│ Supabase Auth         │
│ Upload Page  │──PDF──▶│ Supabase Storage      │
│              │──path─▶│ Edge: POST /process   │
│              │◄─poll─│ Edge: GET /status/:id  │
│ Library Page │◄─rows─│ Supabase DB           │
│ View Page    │◄─.md──│ Supabase Storage      │
└──────────────┘        └──────────────────────┘
```

### How It Works
1. User creates account with email + password (Supabase Auth)
2. User logs in → JWT stored in browser
3. User uploads PDF:
   - **First:** PDF uploaded directly to Supabase Storage (bypasses Edge Function body limits)
   - **Then:** `POST /process-pdf` triggered with the storage path
4. Edge Function:
   - Downloads PDF from Storage
   - `pdf-parse` extracts text
   - Sends to Claude/Gemini with structured prompt
   - Saves output .md files to Storage
   - Updates database row with progress (processing → done/error)
5. Frontend polls `GET /status/:id` during processing — shows live progress bar
6. When done, user views results in browser — tabs for Summary, Key Points, Flashcards
7. User's past uploads appear in Library (reverse chronological) with status badges

## Project Structure

```
smart_pdf_lecture_summarizer/
├── frontend/                  # Static files served locally
│   ├── index.html             # Login page
│   ├── signup.html            # Signup page
│   ├── upload.html            # Upload + process
│   ├── library.html           # Past documents
│   ├── view.html              # View outputs
│   ├── css/
│   │   └── style.css
│   └── js/
│       ├── auth.js
│       ├── supabase-client.js
│       └── app.js
├── supabase/
│   ├── functions/
│   │   └── process-pdf/
│   │       ├── index.ts       # Edge Function (process + status endpoints)
│   │       ├── prompts.ts     # Prompt templates
│   │       ├── extract.ts     # PDF text extraction (pdf-parse)
│   │       └── deno.json
│   └── migrations/
│       └── 001_create_documents.sql  # Table + RLS + Storage policies
├── PROPOSAL.md
├── design.md
└── README.md
```

## Definition of Done

- [ ] User can sign up with email + password and log in
- [ ] User can upload a PDF via drag-and-drop web UI (uploaded directly to Storage, not through Edge Function)
- [ ] Processing progress is shown in real-time (polling-based progress bar)
- [ ] Uploaded PDF's text is extracted and sent to AI (Claude or Gemini)
- [ ] Summary, Key Points, and Flashcards are generated and displayed in browser
- [ ] All generated .md files are stored in Supabase Storage under user's folder
- [ ] User can view past documents in Library page with status badges (processing / done / error)
- [ ] User can click any past document to re-read outputs
- [ ] Files are private — one user cannot access another's files (Storage RLS + DB RLS)
- [ ] API keys are stored server-side (Supabase secrets), never exposed to client
- [ ] Frontend works when served from localhost

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| pdf-parse extracts less text than PyMuPDF | Test with real lecture PDFs first; keep Python extraction as fallback microservice (see design.md §2.6) |
| Edge Function cold start is slow | Accept up to ~2s cold start; polling keeps user informed |
| AI output sometimes invalid JSON | Retry once on parse failure with sharper prompt; surface error to user gracefully |
| User uploads non-PDF or malicious file | Validate file extension + mime type client-side and server-side; reject files > 25 MB |
| Supabase free tier limits (storage/bandwidth/function duration) | Monitor usage; upgrade to Pro plan when needed; function returns timeout error gracefully |
| Browser connection drops during processing | Job continues server-side; user can see updated status in Library on reconnect |

---

*Last updated: 2026-06-15*
