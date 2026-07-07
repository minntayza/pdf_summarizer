---
sketch: 001
name: upload-experience
question: "How should the upload experience feel?"
winner: C
tags: [upload, primary-interaction, cards]
---

# Sketch 001: Upload Experience

## Design Question
How should the upload page feel? This is the primary interaction — users spend the most time here before results appear. The design should feel premium, fast, and satisfying.

## How to View
open .planning/sketches/001-upload-experience/index.html

## Variants
- **A: Clean Card** — Refined version of the current layout. Sharp card with modernized drop zone, pill-style provider toggle, and a polished phase pipeline with connecting lines. Closest to the existing code.
- **B: Split Panel** — Desktop-first two-column layout. Left panel is the drop zone hero, right panel has provider selection and settings. More spacious, cleaner separation of concerns.
- **C: Cinematic** — Full-width hero drop zone with a gradient border glow on hover. Provider/subject selection lives in a floating bottom bar (like Arc's command bar). Progress uses a circular ring instead of a linear bar. Most distinctive and bold.

## What to Look For
1. **Drop zone feel** — Which drop zone feels most inviting to interact with?
2. **Provider toggle** — Which toggle pattern feels most natural for Claude vs Gemini selection?
3. **Processing state** — Which progress visualization feels most satisfying during the 2-5 minute wait?
4. **Overall premium feel** — Which variant feels most polished and modern?
5. **Mobile adaptability** — Which would work best on a phone screen?

## Interactivity
All variants are functional:
- Click the drop zone to trigger a simulated upload with progress animation
- Toggle between Claude/Gemini providers
- Watch the phase pipeline progress through Upload → Summary → Key Points → Flashcards → Quiz
- Variant C has a floating bottom bar with pill-style toggles
