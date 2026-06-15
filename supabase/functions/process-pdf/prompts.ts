// prompts.ts — Prompt templates and output validation

export interface Flashcard {
  question: string;
  answer: string;
}

export interface LectureOutput {
  summary: string;
  key_points: string;
  flashcards: Flashcard[];
}

// ── Prompts ─────────────────────────────────────────────────────────

export const SYSTEM_PROMPT = `You are an expert academic study assistant. Your role is to help students understand lecture materials and prepare for exams.

You will be given the extracted text from an academic lecture PDF. Analyze it carefully and produce a structured JSON response with exactly three fields:

1. **summary** — A bullet-point summary of the lecture covering key definitions, theories, formulas, and core concepts. Organized by topic/section. Use clear, concise Markdown with bullet points and bold for key terms.

2. **key_points** — Exam-focused key points organized by priority:
   - 🔴 High Priority (likely exam questions, must-know concepts)
   - 🟡 Medium Priority (important to understand)
   - ⚠️ Common Pitfalls & Mistakes (frequent student errors, traps)
   Use Markdown format.

3. **flashcards** — An array of Q&A pairs for spaced-repetition studying. Each entry has a "question" and "answer" field. Write questions that test conceptual understanding, not just memorization. Aim for 8-15 high-quality flashcards.

IMPORTANT:
- Output valid JSON only — no markdown fences, no extra text outside the JSON.
- The JSON must have exactly the three keys: summary, key_points, flashcards.
- Write in clear, study-friendly language.
- Be thorough but concise — prioritize what's most important for exam preparation.`;

export function buildUserPrompt(text: string): string {
  return `Here is the extracted text from the lecture PDF:

---
${text}
---

Analyze the lecture content above and return a JSON object with:
- "summary": bullet-point markdown summary organized by topics covered
- "key_points": prioritized markdown exam points
- "flashcards": array of {"question", "answer"} objects for studying`;
}

// ── Validation ──────────────────────────────────────────────────────

export function validateOutput(data: unknown): LectureOutput {
  if (!data || typeof data !== "object") {
    throw new Error("Response is not a JSON object");
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.summary !== "string" || obj.summary.trim().length === 0) {
    throw new Error("Missing or empty 'summary' field");
  }
  if (typeof obj.key_points !== "string" || obj.key_points.trim().length === 0) {
    throw new Error("Missing or empty 'key_points' field");
  }
  if (!Array.isArray(obj.flashcards)) {
    throw new Error("Missing or non-array 'flashcards' field");
  }

  const flashcards: Flashcard[] = [];
  for (const fc of obj.flashcards) {
    if (
      typeof fc === "object" &&
      fc !== null &&
      typeof (fc as Record<string, unknown>).question === "string" &&
      typeof (fc as Record<string, unknown>).answer === "string"
    ) {
      flashcards.push({
        question: (fc as Record<string, string>).question,
        answer: (fc as Record<string, string>).answer,
      });
    }
  }
  if (flashcards.length === 0) {
    throw new Error("No valid flashcards found");
  }

  return {
    summary: obj.summary as string,
    key_points: obj.key_points as string,
    flashcards,
  };
}

// ── JSON parsing ────────────────────────────────────────────────────

export function parseAIResponse(raw: string): LectureOutput {
  let json = raw.trim();
  if (json.startsWith("```json")) {
    json = json.slice(7);
  } else if (json.startsWith("```")) {
    json = json.slice(3);
  }
  if (json.endsWith("```")) {
    json = json.slice(0, -3);
  }
  json = json.trim();

  const parsed = JSON.parse(json);
  return validateOutput(parsed);
}
