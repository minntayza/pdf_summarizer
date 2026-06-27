// prompts.ts — Prompt templates and output validation

export interface Flashcard {
  question: string;
  answer: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct_index: number;
  explanation: string;
}

export interface LectureOutput {
  summary: string;
  key_points: string;
  flashcards: Flashcard[];
  quiz: QuizQuestion[];
}

// ── Language instruction ────────────────────────────────────────────

const LANGUAGE_MAP: Record<string, string> = {
  myanmar: 'Burmese (Myanmar)',
  chinese: 'Chinese (Mandarin)',
  japanese: 'Japanese',
  korean: 'Korean',
  thai: 'Thai',
};

function languageInstruction(lang: string): string {
  if (!lang || lang === 'english') return '';
  const langName = LANGUAGE_MAP[lang] || lang;
  return `\n\nLANGUAGE: Generate ALL output (summary, key_points, flashcards, quiz) in ${langName}. Write naturally in ${langName} — do not transliterate. Use ${langName} script and vocabulary appropriate for university students.`;
}

// ── Prompts ─────────────────────────────────────────────────────────

export function getSystemPrompt(language: string = 'english'): string {
  return `You are an expert academic study assistant. Your role is to help students understand lecture materials and prepare for exams.

You will be given the full PDF of an academic lecture — you can see ALL content including text, diagrams, figures, charts, tables, formulas, and images. The extracted text is also provided as supplementary context. Analyze everything carefully and produce a structured JSON response with exactly four fields:

1. **summary** — A bullet-point summary of the lecture covering key definitions, theories, formulas, diagrams, and core concepts. When the PDF contains figures, charts, or diagrams, describe what they show and what the key takeaway is — do not ignore visual content. Organize by topic/section. Use clear, concise Markdown with bullet points and bold for key terms.

2. **key_points** — Exam-focused key points organized by priority:
   - 🔴 High Priority (likely exam questions, must-know concepts)
   - 🟡 Medium Priority (important to understand)
   - ⚠️ Common Pitfalls & Mistakes (frequent student errors, traps)
   Include important diagram/figure interpretations. Use Markdown format.

3. **flashcards** — An array of Q&A pairs for spaced-repetition studying. Each entry has a "question" and "answer" field. Write questions that test conceptual understanding, not just memorization. Include questions about important diagrams, charts, and figures when present. Aim for 8-15 high-quality flashcards.

4. **quiz** — An array of multiple-choice questions for self-testing. Each entry has:
   - "question": the question text
   - "options": exactly 4 options (A, B, C, D)
   - "correct_index": the 0-based index of the correct option
   - "explanation": a brief explanation of why the answer is correct
   Aim for 8-12 questions that test important concepts, including diagram interpretation.

IMPORTANT:
- Output valid JSON only — no markdown fences, no extra text outside the JSON.
- The JSON must have exactly the four keys: summary, key_points, flashcards, quiz.
- If the PDF contains diagrams/figures/charts — analyze them and include their content in your output.
- Write in clear, study-friendly language.
- Be thorough but concise — prioritize what's most important for exam preparation.${languageInstruction(language)}`;
}

export function buildUserPrompt(text: string, language: string = 'english'): string {
  const langName = LANGUAGE_MAP[language] || language;
  const langNote = language && language !== 'english'
    ? `\n\nIMPORTANT: Generate all output in ${langName}.`
    : '';
  return `Here is the extracted text from the lecture PDF:

---
${text}
---

Analyze the lecture content above and return a JSON object with:
- "summary": bullet-point markdown summary organized by topics covered
- "key_points": prioritized markdown exam points
- "flashcards": array of {"question", "answer"} objects for studying
- "quiz": array of {"question", "options": [4 items], "correct_index": 0-3, "explanation": "..."} objects${langNote}`;
}

export function buildVisionUserPrompt(text: string, language: string = 'english'): string {
  const langName = LANGUAGE_MAP[language] || language;
  const langNote = language && language !== 'english'
    ? `\n\nIMPORTANT: Generate all output in ${langName}.`
    : '';
  return `The PDF lecture document is attached above. You can see all text, diagrams, figures, charts, tables, and images in it.

For reference, here is the extracted text (use this as supplementary context — but rely primarily on what you see in the PDF itself):

---
${text}
---

Analyze the FULL lecture content (text + visuals) and return a JSON object with:
- "summary": bullet-point markdown summary organized by topics covered — include key insights from diagrams/figures
- "key_points": prioritized markdown exam points — include diagram/figure interpretations
- "flashcards": array of {"question", "answer"} objects for studying — include questions about important diagrams
- "quiz": array of {"question", "options": [4 items], "correct_index": 0-3, "explanation": "..."} objects${langNote}`;
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

  // Quiz is optional — gracefully handle if missing
  const quiz: QuizQuestion[] = [];
  if (Array.isArray(obj.quiz)) {
    for (const q of obj.quiz) {
      if (
        typeof q === "object" &&
        q !== null &&
        typeof (q as Record<string, unknown>).question === "string" &&
        Array.isArray((q as Record<string, unknown>).options) &&
        typeof (q as Record<string, unknown>).correct_index === "number" &&
        typeof (q as Record<string, unknown>).explanation === "string"
      ) {
        const qObj = q as Record<string, unknown>;
        const options = (qObj.options as unknown[]).filter(o => typeof o === "string") as string[];
        if (options.length >= 3 && qObj.correct_index >= 0 && qObj.correct_index < options.length) {
          quiz.push({
            question: qObj.question as string,
            options,
            correct_index: qObj.correct_index as number,
            explanation: qObj.explanation as string,
          });
        }
      }
    }
  }

  return {
    summary: obj.summary as string,
    key_points: obj.key_points as string,
    flashcards,
    quiz,
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

  try {
    const parsed = JSON.parse(json);
    return validateOutput(parsed);
  } catch {
    // Attempt to repair truncated JSON (common with non-English outputs hitting token limits)
    const repaired = repairTruncatedJSON(json);
    if (repaired) {
      const parsed = JSON.parse(repaired);
      return validateOutput(parsed);
    }
    throw new Error("AI response was not valid JSON and could not be repaired");
  }
}

/**
 * Attempt to repair JSON that was truncated mid-output (e.g. token limit hit).
 * Strategy: close any open strings, arrays, and objects to make valid JSON.
 */
function repairTruncatedJSON(json: string): string | null {
  // If the JSON doesn't even start correctly, give up
  if (!json.startsWith('{')) return null;

  let s = json;

  // 1. If we're inside a string, close it
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; }
  }
  if (inString) {
    s += '"';
  }

  // 2. Remove trailing comma or partial value if any
  s = s.replace(/,\s*$/, '');

  // 3. Count open brackets/braces and close them
  let braces = 0;
  let brackets = 0;
  inString = false;
  escaped = false;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (escaped) { escaped = false; continue; }
    if (ch === '\\') { escaped = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') braces++;
    else if (ch === '}') braces--;
    else if (ch === '[') brackets++;
    else if (ch === ']') brackets--;
  }

  // Close any open arrays then objects
  for (let i = 0; i < brackets; i++) s += ']';
  for (let i = 0; i < braces; i++) s += '}';

  // Verify it's now valid JSON
  try {
    JSON.parse(s);
    return s;
  } catch {
    return null;
  }
}
