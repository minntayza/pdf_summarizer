# Smart PDF Lecture Summarizer — Proposal by @minntayza

## Gist
စာသင်ကျောင်း သို့မဟုတ် တက္ကသိုလ်သင်ခန်းစာ PDF Lecture ဖိုင်များကို ဖတ်ပြီး ချက်ချင်းလေ့လာကျက်မှတ်နိုင်မည့် Flashcards များ၊ အရေးကြီးသည့်အချက်များနှင့် အနှစ်ချုပ်မှတ်စု (Summary) များအဖြစ် ပြောင်းလဲပေးမည့် စနစ်တစ်ခု တည်ဆောက်ရန်။

## Real User
**@minntayza** — ကျောင်းသား/ကျောင်းသူတစ်ဦးအနေဖြင့် စာမေးပွဲနီးလာတိုင်း ဆရာများက PDF ဖိုင်ရာချီပေးအပ်ပြီး ၎င်းတို့ကို အချိန်တိုအတွင်း မှတ်မိလွယ်အောင် ပြင်ဆင်လိုသူဖြစ်သည်။ ကိုယ်တိုင်လည်း ဤကိရိယာကို အသုံးပြုမည်ဖြစ်ပြီး ပထမဆုံး Test Run အတွက် ကိုယ်ပိုင် Lecture PDF များဖြင့် စမ်းသပ်သွားမည်။

## Story
Aung Aung ဟာ စာမေးပွဲနီးနေချိန်မှာ ဆရာမပေးထားသည့် ရာနဲ့ချီတဲ့ PDF Lecture slides တွေ၊ စာအုပ်အခန်းတွေကို လိုက်ဖတ်ဖို့ အချိန်မလောက်ဖြစ်နေသည်။ ထိုအခါ သူသည် Smart PDF Lecture Summarizer ကို သုံးပြီး PDF စာမျက်နှာအမြောက်အမြားကို မိနစ်ပိုင်းအတွင်း အဓိကမှတ်စု၊ Exam အတွက် အရေးကြီးအချက်များနှင့် ကျက်ရလွယ်ကူသည့် Flashcards တွေအဖြစ် ပြောင်းလဲကာ စာမေးပွဲအတွက် ထိရောက်စွာ ပြင်ဆင်နိုင်ခဲ့သည်။

## Why
ကျောင်းသား/သူများနှင့် စာမေးပွဲဖြေဆိုမည့်သူများသည် PDF format ဖြင့်ရှိသော Lecture ဖိုင်အမြောက်အမြားကို ဖတ်ရှုမှတ်သားရာတွင် အချိန်အလွန်ပေးရသည်။ အရေးကြီးသော core concepts များနှင့် အမေးများနိုင်သည့် အချက်များကို AI Agent နှင့် Subagent Architecture သုံးပြီး PDF ထဲကနေ ထိရောက်စွာ ဆွဲထုတ်ပေးခြင်းဖြင့် စာလေ့လာရမည့်အချိန်ကို များစွာ သက်သာစေနိုင်သည်။

## Why Not
- အစည်းအဝေးမှတ်တမ်းများ (Meeting Transcripts) နှင့် Online Class Video/Audio ဗီဒီယိုဖိုင်များကို လုံးဝ (လုံးဝ) လက်ခံ ဆောင်ရွက်ပေးမည်မဟုတ်ပါ။ (ကျောင်းသုံး/တက္ကသိုလ်သုံး PDF Lecture ဖိုင်များကိုသာ သီးသန့် အဓိကထားပါမည်။)
- PDF ဖိုင်ထဲတွင် ပါဝင်သော ရုပ်ပုံများ (Images/Diagrams) ကို ခွဲခြမ်းစိတ်ဖြာခြင်း (Computer Vision/OCR conversion) **ယခုအဆင့်တွင်** မလုပ်ဆောင်ပါ။ (ဖတ်ရှု၍ရသော စာသားများကိုသာ အဓိကထားဖတ်ပါမည်။ သို့သော် — အင်ဂျင်နီယာ၊ ဇီဝဗေဒ၊ ဘောဂဗေဒဘာသာရပ်များတွင် Diagram များသည် အကြောင်းအရာ၏ 30–50% ရှိတတ်သည်။ Phase 2 တွင် lightweight image captioning ထည့်ရန် စဉ်းစားသင့်သည်။)
- ပြင်ပ Cloud-based Database သို့မဟုတ် ကြီးမားသော Frontend Dashboard များ မပါဝင်ပါ။ (Local CLI သို့မဟုတ် ရိုးရှင်းသော Script အဆင့်သာ ဖြစ်သည်။)

## Tech Spec

### Core Framework & Model
- **Language:** Python 3.11+
- **AI Model:** Mimo (mimo-v2.5-pro) — through Claude Code's own model stack (the same model I'm running on right now)
- **SDK:** Anthropic Python SDK (via API)
- **PDF Parsing:** PyMuPDF (fitz) — or pdfplumber for more structured table extraction
- **Output Format:** Markdown (.md)

### Architecture: Phased Approach

#### Phase 1 (This Week — MVP)
Single-agent synchronous script. One Claude call receives the full extracted text + structured prompt asking for three outputs at once:

```
Input: PDF text → Claude API → JSON { summary, key_points, flashcards } → .md file
```

**Why start simple:** A single well-prompted call achieves ~80% of the result with 1/10th the complexity. If the output quality is insufficient, *then* graduate to multi-agent.

#### Phase 2 (Future — If Needed)
Multi-Agent System (Main Agent + 3 Specialized Subagents) — only if Phase 1 benchmark shows clear gaps:

- **Main Agent (The Academic Coordinator):** PDF Lecture ထဲက စာသားများကို ဖတ်ပြီး အခန်းလိုက် (သို့) အပိုင်းလိုက် ခွဲခြားကာ Subagents များဆီ စနစ်တကျ လုပ်ငန်းခွဲဝေပေးမည်။
- **Subagent A (The Core Summary Expert):** PDF ထဲက အဓိကကျသော Definition များနှင့် သီအိုရီများကို အနှစ်ချုပ်မှတ်စု ထုတ်ပေးမည်။
- **Subagent B (The Key Points Finder):** စာမေးပွဲတွင် မေးလေ့မေးထရှိသော အရေးကြီးဆုံး အချက်အလက်များနှင့် အမေးများနိုင်သည့် အချက်များကို သီးသန့်ဆွဲထုတ်ပေးမည်။
- **Subagent C (The Flashcard Generator):** အရေးကြီးသည့် Technical terms များနှင့် Concept များကို အမေး/အဖြေ (Q&A) Flashcard ပုံစံ ပြောင်းပေးမည်။

**MCP Protocol Note:** MCP သည် filesystem access အတွက်သော်လည်းကောင်း၊ future multi-agent communication fabric အဖြစ်သော်လည်းကောင်း သုံးနိုင်သည်။ Phase 1 တွင် MCP မလိုအပ်ပါ — simple function calls ဖြင့် စတင်နိုင်သည်။

## Project Structure (Phase 1)

```
smart_pdf_lecture_summarizer/
├── input/                  # Place PDFs here
│   └── (your_lecture).pdf
├── output/                 # Generated .md files land here
│   └── (lecture_name)/
│       ├── summary.md
│       ├── key_points.md
│       └── flashcards.md
├── main.py                 # Entry point: reads PDF, calls API, writes output
├── pdf_reader.py           # Extract text from PDF (PyMuPDF)
├── prompts.py              # Structured prompts for Claude
├── requirements.txt        # deps
└── PROPOSAL.md             # This file
```

## Definition of Done

- [ ] Local `input/` folder ထဲက Lecture PDF ဖိုင်ကို အောင်မြင်စွာ ဖတ်ရှုပြီး စာသားထုတ်ယူနိုင်ရမည်။
- [ ] Claude API သို့ PDF text ကို ပေးပို့ကာ structured output ({summary, key_points, flashcards}) ကို JSON format ဖြင့် ရယူနိုင်ရမည်။
- [ ] **Summary** — အဓိကကျသော Lecture Summary ကို ထုတ်နုတ်ပေးနိုင်ရမည် (bullet points + key definitions)။
- [ ] **Key Points** — စာမေးပွဲအတွက် အရေးကြီးအချက်များကို ရှာဖွေပေးနိုင်ရမည် (exam predictions, common pitfalls)။
- [ ] **Flashcards** — မေးခွန်းနှင့်အဖြေ ပုံစံ Flashcards များကို တည်ဆောက်ပေးနိုင်ရမည် (Q&A pairs, spaced-repetition ready)။
- [ ] ရလဒ်အားလုံးကို သပ်ရပ်သော Markdown (.md) ဖိုင်အဖြစ် `output/` folder ထဲသို့ သိမ်းဆည်းပေးနိုင်ရမည်။
- [ ] CLI တစ်ခုတည်းဖြင့် run နိုင်ရမည်: `python main.py input/lecture.pdf`

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| PDF မှာ image-heavy diagrams များပါက text extract လုပ်လို့မရသော content များများထွက် | Phase 1 acceptance criterion: text-heavy theory PDFs များကိုသာ target ထားရန် |
| Claude output က အမြဲ consistent structured JSON မရ | Prompt တွင် explicit JSON schema ထည့်ရန် + Pydantic output validation |
| Long PDF (>50 pages) အတွက် context window ပြည့် | Chunking strategy — PDF ကို section အလိုက်ခွဲပြီး parallel/serial process လုပ်ရန် |
| Multi-agent က single call ထက် quality သိသိသာသာမကောင်း | Phase 2 သို့မပြောင်းမီ A/B benchmark လုပ်ရန် |

---

*Last updated: 2026-06-15*
