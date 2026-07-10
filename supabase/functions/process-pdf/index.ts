// index.ts — Supabase Edge Function: POST /process-pdf + GET /status/:id
//
// POST /process-pdf — Trigger PDF processing (returns immediately)
// GET /status/:doc_id — Poll for job progress and results
//
// Deploy: supabase functions deploy process-pdf
// Secrets required:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase secrets set GEMINI_API_KEY=...

import { createClient } from "@supabase/supabase-js";
import { extractText, NoTextExtractedError, getWordCount } from "./extract.ts";
import {
  getSystemPrompt,
  buildUserPrompt,
  buildVisionUserPrompt,
  parseAIResponse,
  LectureOutput,
} from "./prompts.ts";

// ── CORS headers ────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ── Binary to base64 (chunked, no stack overflow on large PDFs) ─────

function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000; // 32 KB — safe for V8 spread operator
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += CHUNK) {
    const slice = bytes.subarray(i, i + CHUNK);
    // Convert each chunk to binary string then base64 — avoids building
    // one massive binary string before encoding (stack-safe + memory-safe)
    parts.push(btoa(String.fromCharCode(...slice)));
  }
  return parts.join("");
}

function corsResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

// ── Auth helper ─────────────────────────────────────────────────────

async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  // Create a Supabase client with the user's JWT
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

// ── AI Provider Calls ───────────────────────────────────────────────

async function callClaude(text: string, language: string = "english", pdfBase64?: string): Promise<LectureOutput> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("Claude API key not configured");

  const rawBase = Deno.env.get("ANTHROPIC_BASE_URL") || "https://api.anthropic.com";
  const baseUrl = rawBase.replace(/\/v1\/?$/, "");
  const model = Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-4-6";

  // Build user message content — send PDF as document when available (vision mode)
  const userContent = pdfBase64
    ? [
        {
          type: "document" as const,
          source: {
            type: "base64" as const,
            media_type: "application/pdf" as const,
            data: pdfBase64,
          },
        },
        {
          type: "text" as const,
          text: buildVisionUserPrompt(text, language),
        },
      ]
    : buildUserPrompt(text, language);

  // Non-English output (especially Burmese/Chinese/Japanese) requires many
  // more tokens because each character encodes to multiple JSON tokens.
  const isNonEnglish = language && language !== 'english';
  const isOfficialAnthropic = !Deno.env.get("ANTHROPIC_BASE_URL") ||
    Deno.env.get("ANTHROPIC_BASE_URL") === "https://api.anthropic.com";
  // Use smaller max_tokens for proxy (faster response), but non-English still
  // needs more than English because each character encodes to multiple JSON tokens.
  const maxTokens = isNonEnglish
    ? (isOfficialAnthropic ? 16384 : 8192)
    : (isOfficialAnthropic ? 6144 : 8192);

  // Single attempt: 180s proxy, 180s official. Non-English (Myanmar etc.) needs
  // more time because the proxy is slower and each token is more expensive.
  const baseTimeout = isOfficialAnthropic ? 180_000 : 180_000;
  const timeoutMs = isNonEnglish ? baseTimeout + 60_000 : baseTimeout;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let resp: Response;
  try {
    resp = await fetch(`${baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system: getSystemPrompt(language),
        messages: [{ role: "user", content: userContent }],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!resp.ok) {
    const status = resp.status;
    if (status === 401 || status === 403) {
      throw new Error(`Claude API authentication failed (${status}). Check your ANTHROPIC_API_KEY and ANTHROPIC_BASE_URL secrets in Supabase.`);
    }
    if (status === 429) {
      throw new Error(`Claude API rate limited (429). Try again in a few minutes.`);
    }
    if (status === 502 || status === 503 || status === 504) {
      throw new Error(`Claude proxy is temporarily unavailable (${status}). Wait a few minutes and retry.`);
    }
    const errBody = await resp.text().catch(() => "");
    if (errBody.trimStart().startsWith("<!DOCTYPE") || errBody.trimStart().startsWith("<html")) {
      throw new Error(`Claude API error (${status}). The proxy returned an invalid response. Try again in a few minutes.`);
    }
    throw new Error(`Claude API error (${status}): ${errBody.slice(0, 200)}`);
  }

  // Check for timeout (AbortController)
  if (controller.signal.aborted) {
    const endpoint = isOfficialAnthropic ? "Anthropic" : "proxy";
    throw new Error(`Claude API timeout (${endpoint}). The request took too long. Try again or use a smaller PDF.`);
  }

  // Log successful response time for debugging
  console.log(`Claude API response received (${isOfficialAnthropic ? 'official' : 'proxy'})`);

  const data = await resp.json();
  const raw = data?.content?.find((c: Record<string, unknown>) => c.type === "text")?.text ?? "";
  if (!raw) throw new Error("Empty response from Claude");

  return parseAIResponse(raw);
}

async function callGemini(text: string, language: string = "english", pdfBase64?: string): Promise<LectureOutput> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Gemini API key not configured");

  const model = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000); // 60s — same as Claude proxy

  // Build parts — send PDF as inlineData when available (vision mode)
  const parts = pdfBase64
    ? [
        {
          inlineData: {
            mimeType: "application/pdf",
            data: pdfBase64,
          },
        },
        { text: buildVisionUserPrompt(text, language) },
      ]
    : [{ text: buildUserPrompt(text, language) }];

  // Non-English output needs more tokens (Burmese ~3-4× more than English)
  const maxTokens = language && language !== 'english' ? 32768 : 6144;

  let resp: Response;
  try {
    resp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: getSystemPrompt(language) }] },
          contents: [{ parts }],
          generationConfig: { maxOutputTokens: maxTokens },
        }),
        signal: controller.signal,
      },
    );
  } finally {
    clearTimeout(timeout);
  }

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Gemini API error (${resp.status}): ${JSON.stringify(err)}`);
  }

  const data = await resp.json();
  const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  if (!raw) throw new Error("Empty response from Gemini");

  return parseAIResponse(raw);
}

async function callAI(
  text: string,
  provider: string,
  language: string = "english",
  pdfBase64?: string,
): Promise<LectureOutput> {
  if (provider === "gemini") return callGemini(text, language, pdfBase64);
  return callClaude(text, language, pdfBase64); // default: claude
}

// ── Process PDF (background, after fast response) ───────────────────

const CHUNK_SIZE = 60000; // characters per chunk (mirrors main.py)
const PROXY_CHUNK_SIZE = 12000; // smaller chunks for proxy — faster per-call, avoids 8min+ hangs

function aiErrorMessage(err: unknown): string {
  let msg = err instanceof Error ? err.message : String(err);

  if (msg.includes("Gemini API key not configured")) {
    return "Gemini is not set up yet. Use Claude instead.";
  }
  if (msg.includes("502") || msg.includes("Bad gateway")) {
    return "Claude proxy is temporarily unavailable (502). Wait a few minutes and retry, or use a smaller PDF.";
  }
  if (msg.includes("The signal has been aborted") || /timed out/i.test(msg)) {
    return "Processing took too long. The AI service may be experiencing high traffic — please retry in a few minutes, or try a smaller PDF.";
  }
  if (msg.includes("<!DOCTYPE") || msg.includes("<html")) {
    return "Claude proxy returned an error page. Wait a few minutes and try again.";
  }
  if (/try Gemini/i.test(msg)) {
    msg = msg.replace(/try Gemini or re-upload\.?\s*/gi, "retry later. ");
  }
  return msg.length > 300 ? msg.slice(0, 300) + "…" : msg;
}

/** Keep progress_msg alive during long AI calls so the UI does not look frozen. */
async function withHeartbeat(
  update: (fields: Record<string, unknown>) => Promise<void>,
  label: string,
  progress: number,
  fn: () => Promise<LectureOutput>,
): Promise<LectureOutput> {
  let tick = 0;
  const heartbeat = setInterval(() => {
    tick++;
    update({
      progress,
      progress_msg: `Still processing with ${label}… (${tick * 30}s)`,
    }).catch(() => {});
  }, 30_000);
  try {
    return await fn();
  } finally {
    clearInterval(heartbeat);
  }
}

async function callAIWithChunking(
  text: string,
  provider: string,
  update: (fields: Record<string, unknown>) => Promise<void>,
  language: string = "english",
  pdfBase64?: string,
): Promise<LectureOutput> {
  const label = provider === "gemini" ? "Gemini" : "Claude";

  // ── Vision mode: send full PDF (with images/diagrams) in one shot ──
  // Only use vision mode with the official Anthropic API (not proxied endpoints)
  const isOfficialAnthropic = !Deno.env.get("ANTHROPIC_BASE_URL") ||
    Deno.env.get("ANTHROPIC_BASE_URL") === "https://api.anthropic.com";
  if (pdfBase64 && isOfficialAnthropic) {
    try {
      return await callAI(text, provider, language, pdfBase64);
    } catch {
      // Vision failed — fall back to text-only mode
      await update({ progress: 30, progress_msg: `Vision mode failed, using text extraction…` });
    }
  }

  // ── Text-only fallback: chunk large PDFs by character count ──
  // Use smaller chunks for proxy endpoints (faster processing)
  const chunkSize = isOfficialAnthropic ? CHUNK_SIZE : PROXY_CHUNK_SIZE;

  // Small PDF — send in one shot
  if (text.length <= chunkSize) {
    try {
      return await withHeartbeat(update, label, 35, () => callAI(text, provider, language));
    } catch (err) {
      const errMsg = aiErrorMessage(err);
      console.error(`First attempt failed: ${errMsg}`);
      await update({ progress: 40, progress_msg: `Retrying ${label} (attempt 2/2)…` });
      await new Promise((r) => setTimeout(r, 3000));
      try {
        return await withHeartbeat(update, label, 40, () => callAI(text, provider, language));
      } catch (retryErr) {
        const retryMsg = aiErrorMessage(retryErr);
        throw new Error(
          `AI processing failed after retry. The proxy may be slow or overloaded — wait and re-upload. First: ${errMsg}. Retry: ${retryMsg}`,
        );
      }
    }
  }

  // Large PDF — split by page boundaries (page markers added by pdf-parse)
  const pages = text.split("\n[Page ");
  const chunks: string[] = [];
  let current: string[] = [];
  let currentLen = 0;

  for (const pageText of pages) {
    const pageLen = pageText.length;
    if (currentLen + pageLen > chunkSize && current.length > 0) {
      chunks.push("\n[Page " + current.join(""));
      current = [pageText];
      currentLen = pageLen;
    } else {
      current.push(pageText);
      currentLen += pageLen;
    }
  }
  if (current.length > 0) {
    chunks.push("\n[Page " + current.join(""));
  }

  const totalChunks = chunks.length;
  const merged: LectureOutput = { summary: "", key_points: "", flashcards: [], quiz: [] };
  const skippedChunks: number[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const pct = 40 + Math.floor((i / totalChunks) * 50);
    await update({
      progress: pct,
      progress_msg: `Processing chunk ${i + 1}/${totalChunks} with ${label}…`,
    });

    let result: LectureOutput | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await withHeartbeat(update, label, pct, () => callAI(chunks[i], provider, language));
        break;
      } catch (err) {
        if (attempt === 0) {
          await update({ progress: pct, progress_msg: `Retrying chunk ${i + 1}/${totalChunks} (attempt 2/2)…` });
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
        console.error(`Chunk ${i + 1}/${totalChunks} failed:`, aiErrorMessage(err));
        skippedChunks.push(i + 1);
      }
    }

    if (result) {
      const prefix = i === 0 ? "" : "\n\n";
      merged.summary += `${prefix}## Part ${i + 1}\n\n${result.summary}`;
      merged.key_points += `${prefix}### Part ${i + 1}\n\n${result.key_points}`;
      merged.flashcards.push(...result.flashcards);
      merged.quiz.push(...result.quiz);
    }
  }

  // If ALL chunks failed, throw an error so the document is marked as "error"
  // (must check BEFORE appending warnings, otherwise the warning text makes
  // merged.summary truthy and the failure is silently treated as success)
  if (skippedChunks.length === totalChunks) {
    throw new Error("AI processing failed — the service may be slow or overloaded. Please re-upload this PDF.");
  }

  // Surface skipped chunks as warnings in the output so the user knows content is missing
  if (skippedChunks.length > 0) {
    const warning = `\n\n---\n> ⚠️ **Warning:** Chunk(s) ${skippedChunks.join(", ")} could not be processed. Some content may be missing from this summary.\n`;
    merged.summary += warning;
    merged.key_points += warning;
  }

  // Double-check: no content at all
  if (!merged.summary && merged.flashcards.length === 0) {
    throw new Error("All chunks failed to process");
  }

  return merged;
}

async function processPDF(
  supabaseService: ReturnType<typeof createClient>,
  docId: string,
  userId: string,
  pdfPath: string,
  provider: string,
  language: string = "english",
) {
  const update = async (fields: Record<string, unknown>) => {
    await supabaseService
      .from("documents")
      .update(fields)
      .eq("id", docId)
      .eq("user_id", userId);
  };

  // Safety timeout: must complete before Supabase kills the isolate.
  // Allow enough room for: first attempt + 3s retry delay + second attempt.
  // English: 180s + 3s + 180s = 363s → 600s gives margin for chunked PDFs
  // Non-English: 240s + 3s + 240s = 483s → 720s gives margin
  const isNonEnglish = language && language !== "english";
  const PROCESSING_TIMEOUT_MS = isNonEnglish ? 720_000 : 600_000;
  const timeoutId = setTimeout(async () => {
    await update({
      status: "error",
      error_msg: "Processing took too long. Please retry — the AI service may be busy, or try a smaller PDF.",
      progress: 0,
      progress_msg: "Timed out",
    });
  }, PROCESSING_TIMEOUT_MS);

  try {
    // 1. Download PDF from Storage
    await update({ progress: 10, progress_msg: "Downloading PDF…" });

    const { data: pdfBlob, error: downloadErr } = await supabaseService.storage
      .from("pdfs")
      .download(pdfPath.replace("pdfs/", ""));

    if (downloadErr || !pdfBlob) {
      throw new Error("Failed to download PDF from storage");
    }

    // 2. Extract text (for metadata + supplementary context for vision AI)
    await update({ progress: 15, progress_msg: "Extracting text…" });

    const pdfBuffer = await pdfBlob.arrayBuffer();
    const { text, pageCount } = await extractText(pdfBuffer);
    const wordCount = getWordCount(text);

    // Convert PDF to base64 for vision API (AI sees images, diagrams, charts)
    // Use streaming chunked conversion — avoids String.fromCharCode spread stack overflow
    const pdfBytes = new Uint8Array(pdfBuffer);
    const pdfBase64 = bytesToBase64(pdfBytes);

    await update({
      progress: 25,
      progress_msg: `Extracted ${pageCount} pages, ~${wordCount.toLocaleString()} words`,
      page_count: pageCount,
      word_count: wordCount,
    });

    // 3. Call AI — vision mode (images) if official API, text-only if proxied
    const label = provider === "gemini" ? "Gemini" : "Claude";
    const isOfficialAnthropic = !Deno.env.get("ANTHROPIC_BASE_URL") ||
      Deno.env.get("ANTHROPIC_BASE_URL") === "https://api.anthropic.com";
    const modeLabel = (pdfBase64 && isOfficialAnthropic) ? "text + figures" : "text extraction";
    await update({ progress: 30, progress_msg: `Analyzing PDF with ${label} (${modeLabel})…` });

    const result = await callAIWithChunking(text, provider, update, language, pdfBase64);

    await update({ progress: 80, progress_msg: "Writing output files…" });

    // 4. Write .md files to Storage (parallel uploads with atomic error handling)
    const outputPrefix = `outputs/${userId}/${docId}`;
    const dateStr = new Date().toISOString().split("T")[0];

    const fcLines = result.flashcards
      .map(
        (fc, i) =>
          `## Flashcard ${i + 1}\n**Q:** ${fc.question}\n**A:** ${fc.answer}\n`,
      )
      .join("\n");

    const quizLines = result.quiz
      .map(
        (q, i) => {
          const opts = q.options.map((o, j) => `${String.fromCharCode(65 + j)}. ${o}`).join("\n");
          return `## Question ${i + 1}\n${q.question}\n\n${opts}\n\n**Correct:** ${String.fromCharCode(65 + q.correct_index)}\n**Explanation:** ${q.explanation}\n`;
        },
      )
      .join("\n");

    const uploadResults = await Promise.all([
      supabaseService.storage
        .from("outputs")
        .upload(
          `${userId}/${docId}/summary.md`,
          new TextEncoder().encode(
            `# Summary\n\n${result.summary.trim()}\n\n---\n> Generated by Smart PDF Summarizer (${label}) on ${dateStr}\n`,
          ),
          { contentType: "text/markdown", upsert: true },
        ),
      supabaseService.storage
        .from("outputs")
        .upload(
          `${userId}/${docId}/key_points.md`,
          new TextEncoder().encode(
            `# Key Exam Points\n\n${result.key_points.trim()}\n\n---\n> Generated by Smart PDF Summarizer (${label}) on ${dateStr}\n`,
          ),
          { contentType: "text/markdown", upsert: true },
        ),
      supabaseService.storage
        .from("outputs")
        .upload(
          `${userId}/${docId}/flashcards.md`,
          new TextEncoder().encode(
            `# Flashcards\n\n${fcLines}\n---\n> Generated by Smart PDF Summarizer (${label}) on ${dateStr}\n`,
          ),
          { contentType: "text/markdown", upsert: true },
        ),
      supabaseService.storage
        .from("outputs")
        .upload(
          `${userId}/${docId}/quiz.md`,
          new TextEncoder().encode(
            `# Quiz\n\n${quizLines}\n---\n> Generated by Smart PDF Summarizer (${label}) on ${dateStr}\n`,
          ),
          { contentType: "text/markdown", upsert: true },
        ),
    ]);

    // Check for upload failures
    const fileNames = ["summary.md", "key_points.md", "flashcards.md", "quiz.md"];
    const failedFiles: string[] = [];
    for (let i = 0; i < uploadResults.length; i++) {
      if (uploadResults[i].error) {
        console.error(`Failed to upload ${fileNames[i]}:`, uploadResults[i].error);
        failedFiles.push(fileNames[i]);
      }
    }

    if (failedFiles.length > 0) {
      throw new Error(`Failed to save: ${failedFiles.join(", ")}. Please try again.`);
    }

    // 5. Mark done — include summary_text for full-text search
    await update({
      status: "done",
      progress: 100,
      progress_msg: "Complete!",
      error_msg: null,
      output_prefix: outputPrefix,
      flashcard_count: result.flashcards.length,
      quiz_count: result.quiz.length,
      summary_text: result.summary,
    });

    clearTimeout(timeoutId);

    // Clean up uploaded PDF (optional — keep for history)
    // await supabaseService.storage.from("pdfs").remove([pdfPath]);
  } catch (err) {
    clearTimeout(timeoutId);
    const msg = aiErrorMessage(err);
    try {
      await update({ status: "error", error_msg: msg, progress: 0, progress_msg: "Error" });
    } catch (updateErr) {
      console.error("Failed to update document status to error:", updateErr);
    }
  }
}

// ── Main handler ────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  const url = new URL(req.url);

  // ── GET /status/:doc_id ────────────────────────────────────
  if (req.method === "GET" && url.pathname.startsWith("/status/")) {
    const docId = url.pathname.split("/status/")[1];
    if (!docId) return corsResponse({ error: "Missing doc_id" }, 400);

    const userId = await getUserId(req);
    if (!userId) return corsResponse({ error: "Authentication required" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: doc, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", docId)
      .eq("user_id", userId)
      .single();

    if (error || !doc) {
      return corsResponse({ error: "Document not found" }, 404);
    }

    // Build result payload when done — use signed URLs since outputs bucket is private
    let result = null;
    if (doc.status === "done" && doc.output_prefix) {
      const signedExpiry = 604800; // 7 days in seconds

      const [summaryRes, keyPointsRes, flashcardsRes, quizRes] = await Promise.all([
        supabase.storage.from("outputs").createSignedUrl(`${userId}/${docId}/summary.md`, signedExpiry),
        supabase.storage.from("outputs").createSignedUrl(`${userId}/${docId}/key_points.md`, signedExpiry),
        supabase.storage.from("outputs").createSignedUrl(`${userId}/${docId}/flashcards.md`, signedExpiry),
        supabase.storage.from("outputs").createSignedUrl(`${userId}/${docId}/quiz.md`, signedExpiry),
      ]);

      // Only include URLs that were successfully generated
      result = {
        summary_url: summaryRes.data?.signedUrl || null,
        key_points_url: keyPointsRes.data?.signedUrl || null,
        flashcards_url: flashcardsRes.data?.signedUrl || null,
        quiz_url: quizRes.data?.signedUrl || null,
      };

      // Log any failures so operators can investigate
      if (summaryRes.error) console.error("Failed to sign summary URL:", summaryRes.error);
      if (keyPointsRes.error) console.error("Failed to sign key_points URL:", keyPointsRes.error);
      if (flashcardsRes.error) console.error("Failed to sign flashcards URL:", flashcardsRes.error);
      if (quizRes.error) console.error("Failed to sign quiz URL:", quizRes.error);
    }

    return corsResponse({
      doc_id: doc.id,
      status: doc.status,
      progress: doc.progress,
      progress_msg: doc.progress_msg,
      filename: doc.filename,
      page_count: doc.page_count,
      word_count: doc.word_count,
      flashcard_count: doc.flashcard_count,
      quiz_count: doc.quiz_count,
      provider: doc.provider,
      language: doc.language,
      result,
      error: doc.error_msg,
      created_at: doc.created_at,
    });
  }

  // ── POST /process-pdf ──────────────────────────────────────
  if (req.method === "POST" && url.pathname === "/process-pdf") {
    const userId = await getUserId(req);
    if (!userId) return corsResponse({ error: "Authentication required" }, 401);

    let body: { doc_id?: string; pdf_path?: string; provider?: string; custom_filename?: string; language?: string };
    try {
      body = await req.json();
    } catch {
      return corsResponse({ error: "Invalid JSON body" }, 400);
    }

    const { doc_id, pdf_path, provider, custom_filename, language } = body;

    if (!doc_id || !pdf_path) {
      return corsResponse(
        { error: "Missing required fields: doc_id, pdf_path" },
        400,
      );
    }

    // Verify pdf_path belongs to this user
    if (!pdf_path.startsWith(`pdfs/${userId}/`) && !pdf_path.startsWith(`${userId}/`)) {
      return corsResponse({ error: "Access denied" }, 403);
    }

    const aiProvider = provider === "gemini" ? "gemini" : "claude";

    // Service-role client for background work (bypasses RLS)
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const aiLanguage = language || "english";

    // Insert document row
    const { error: insertErr } = await supabaseService
      .from("documents")
      .insert({
        id: doc_id,
        user_id: userId,
        filename: custom_filename || pdf_path.split("/").pop() || "unknown.pdf",
        provider: aiProvider,
        status: "processing",
        progress: 0,
        progress_msg: "Starting…",
        pdf_path: pdf_path.startsWith("pdfs/") ? pdf_path : `pdfs/${pdf_path}`,
        language: aiLanguage,
      });

    if (insertErr) {
      return corsResponse({ error: `Database error: ${insertErr.message}` }, 500);
    }

    // Return immediately — the frontend polls /status/:doc_id for progress.
    // Processing runs in the background via EdgeRuntime.waitUntil so it
    // continues even after the response is sent.
    const normalizedPath = pdf_path.startsWith("pdfs/") ? pdf_path : `pdfs/${pdf_path}`;

    // Fire-and-forget background processing
    EdgeRuntime.waitUntil(
      processPDF(supabaseService, doc_id, userId, normalizedPath, aiProvider, aiLanguage)
        .catch(err => console.error("processPDF failed:", err)),
    );

    return corsResponse(
      {
        doc_id,
        status: "processing",
        message: "PDF processing started. Poll /status/" + doc_id + " for progress.",
      },
      202,
    );
  }

  // ── 404 ────────────────────────────────────────────────────
  return corsResponse({ error: "Not found" }, 404);
});
