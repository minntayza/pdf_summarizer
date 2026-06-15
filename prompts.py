"""Structured prompts for Gemini and Pydantic validation schemas."""

from pydantic import BaseModel


# ── Pydantic validation models ─────────────────────────────────

class Flashcard(BaseModel):
    question: str
    answer: str


class LectureOutput(BaseModel):
    summary: str
    key_points: str
    flashcards: list[Flashcard]


# ── Prompt templates ────────────────────────────────────────────

SYSTEM_PROMPT = """You are an expert academic study assistant. Your role is to help students understand lecture materials and prepare for exams.

You will be given the extracted text from an academic lecture PDF. Analyze it carefully and produce a structured JSON response with exactly three fields:

1. **summary** — A bullet-point summary of the lecture covering key definitions, theories, formulas, and core concepts. Organized by topic/section. Use clear, concise Markdown with bullet points and bold for key terms.

2. **key_points** — Exam-focused key points organized by priority:
   - 🔴 High Priority (likely exam questions, must-know concepts)
   - 🟡 Medium Priority (important to understand)
   - ⚠️ Common Pitfalls & Mistakes (frequent student errors, traps)
   Use Markdown format.

3. **flashcards** — An array of Q&A pairs for spaced-repetition studying. Each entry has a `question` and `answer` field. Write questions that test conceptual understanding, not just memorization. Aim for 8-15 high-quality flashcards.

IMPORTANT:
- Output valid JSON only — no markdown fences, no extra text outside the JSON.
- The JSON must have exactly the three keys: summary, key_points, flashcards.
- Write in clear, study-friendly language.
- Be thorough but concise — prioritize what's most important for exam preparation."""

USER_PROMPT_TEMPLATE = """Here is the extracted text from the lecture PDF:

---
{text}
---

Analyze the lecture content above and return a JSON object with:
- "summary": bullet-point markdown summary organized by topics covered
- "key_points": prioritized markdown exam points
- "flashcards": array of {{"question", "answer"}} objects for studying"""


def build_user_prompt(text: str) -> str:
    """Build the user prompt with the extracted PDF text embedded."""
    return USER_PROMPT_TEMPLATE.format(text=text)
