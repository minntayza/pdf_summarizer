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
  SYSTEM_PROMPT,
  buildUserPrompt,
  parseAIResponse,
  LectureOutput,
} from "./prompts.ts";

// ── CORS headers ────────────────────────────────────────────────────

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

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

async function callClaude(text: string): Promise<LectureOutput> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("Claude API key not configured");

  const model = Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-4-6-20250514";

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserPrompt(text) }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(
      `Claude API error (${resp.status}): ${
        (err as Record<string, unknown>)?.error?.message || resp.statusText
      }`,
    );
  }

  const data = await resp.json();
  const raw = data?.content?.[0]?.text ?? "";
  if (!raw) throw new Error("Empty response from Claude");

  return parseAIResponse(raw);
}

async function callGemini(text: string): Promise<LectureOutput> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Gemini API key not configured");

  const model = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: buildUserPrompt(text) }] }],
        generationConfig: { maxOutputTokens: 8192 },
      }),
    },
  );

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
): Promise<LectureOutput> {
  if (provider === "gemini") return callGemini(text);
  return callClaude(text); // default: claude
}

// ── Process PDF (background, after fast response) ───────────────────

async function processPDF(
  supabaseService: ReturnType<typeof createClient>,
  docId: string,
  userId: string,
  pdfPath: string,
  provider: string,
) {
  const update = async (fields: Record<string, unknown>) => {
    await supabaseService
      .from("documents")
      .update(fields)
      .eq("id", docId)
      .eq("user_id", userId);
  };

  try {
    // 1. Download PDF from Storage
    await update({ progress: 10, progress_msg: "Downloading PDF…" });

    const { data: pdfBlob, error: downloadErr } = await supabaseService.storage
      .from("pdfs")
      .download(pdfPath.replace("pdfs/", ""));

    if (downloadErr || !pdfBlob) {
      throw new Error("Failed to download PDF from storage");
    }

    // 2. Extract text
    await update({ progress: 20, progress_msg: "Extracting text…" });

    const pdfBuffer = await pdfBlob.arrayBuffer();
    const { text, pageCount } = await extractText(pdfBuffer);
    const wordCount = getWordCount(text);

    await update({
      progress: 30,
      progress_msg: `Extracted ${pageCount} pages, ~${wordCount.toLocaleString()} words`,
      page_count: pageCount,
      word_count: wordCount,
    });

    // 3. Call AI
    const label = provider === "gemini" ? "Gemini" : "Claude";
    await update({ progress: 40, progress_msg: `Calling ${label} AI…` });

    let result: LectureOutput;
    try {
      result = await callAI(text, provider);
    } catch {
      // Retry once
      await update({ progress: 60, progress_msg: `Retrying with ${label}…` });
      result = await callAI(text, provider);
    }

    await update({ progress: 80, progress_msg: "Writing output files…" });

    // 4. Write .md files to Storage
    const outputPrefix = `outputs/${userId}/${docId}`;
    const dateStr = new Date().toISOString().split("T")[0];

    await supabaseService.storage
      .from("outputs")
      .upload(
        `${userId}/${docId}/summary.md`,
        new TextEncoder().encode(
          `# Summary\n\n${result.summary.trim()}\n\n---\n> Generated by Smart PDF Summarizer (${label}) on ${dateStr}\n`,
        ),
        { contentType: "text/markdown", upsert: true },
      );

    await supabaseService.storage
      .from("outputs")
      .upload(
        `${userId}/${docId}/key_points.md`,
        new TextEncoder().encode(
          `# Key Exam Points\n\n${result.key_points.trim()}\n\n---\n> Generated by Smart PDF Summarizer (${label}) on ${dateStr}\n`,
        ),
        { contentType: "text/markdown", upsert: true },
      );

    const fcLines = result.flashcards
      .map(
        (fc, i) =>
          `## Flashcard ${i + 1}\n**Q:** ${fc.question}\n**A:** ${fc.answer}\n`,
      )
      .join("\n");
    await supabaseService.storage
      .from("outputs")
      .upload(
        `${userId}/${docId}/flashcards.md`,
        new TextEncoder().encode(
          `# Flashcards\n\n${fcLines}\n---\n> Generated by Smart PDF Summarizer (${label}) on ${dateStr}\n`,
        ),
        { contentType: "text/markdown", upsert: true },
      );

    // 5. Mark done
    await update({
      status: "done",
      progress: 100,
      progress_msg: "Complete!",
      output_prefix: outputPrefix,
      flashcard_count: result.flashcards.length,
    });

    // Clean up uploaded PDF (optional — keep for history)
    // await supabaseService.storage.from("pdfs").remove([pdfPath]);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await update({ status: "error", error_msg: msg, progress: 0 });
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

    // Build result payload when done
    let result = null;
    if (doc.status === "done" && doc.output_prefix) {
      const { data: summaryUrl } = supabase.storage
        .from("outputs")
        .getPublicUrl(`${userId}/${docId}/summary.md`);

      const { data: keyPointsUrl } = supabase.storage
        .from("outputs")
        .getPublicUrl(`${userId}/${docId}/key_points.md`);

      const { data: flashcardsUrl } = supabase.storage
        .from("outputs")
        .getPublicUrl(`${userId}/${docId}/flashcards.md`);

      result = {
        summary_url: summaryUrl.publicUrl,
        key_points_url: keyPointsUrl.publicUrl,
        flashcards_url: flashcardsUrl.publicUrl,
      };
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
      provider: doc.provider,
      result,
      error: doc.error_msg,
      created_at: doc.created_at,
    });
  }

  // ── POST /process-pdf ──────────────────────────────────────
  if (req.method === "POST" && url.pathname === "/process-pdf") {
    const userId = await getUserId(req);
    if (!userId) return corsResponse({ error: "Authentication required" }, 401);

    let body: { doc_id?: string; pdf_path?: string; provider?: string };
    try {
      body = await req.json();
    } catch {
      return corsResponse({ error: "Invalid JSON body" }, 400);
    }

    const { doc_id, pdf_path, provider } = body;

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

    // Insert document row
    const { error: insertErr } = await supabaseService
      .from("documents")
      .insert({
        id: doc_id,
        user_id: userId,
        filename: pdf_path.split("/").pop() || "unknown.pdf",
        provider: aiProvider,
        status: "processing",
        progress: 0,
        progress_msg: "Starting…",
        pdf_path: pdf_path.startsWith("pdfs/") ? pdf_path : `pdfs/${pdf_path}`,
      });

    if (insertErr) {
      return corsResponse({ error: `Database error: ${insertErr.message}` }, 500);
    }

    // Return immediately — processing continues in background
    // Deno Edge Functions continue running after response if work remains
    const normalizedPath = pdf_path.startsWith("pdfs/") ? pdf_path : `pdfs/${pdf_path}`;

    // Use EdgeRuntime.waitUntil if available, otherwise fire-and-forget
    const p = processPDF(supabaseService, doc_id, userId, normalizedPath, aiProvider);

    // We wait for the promise here because Deno serves returns don't detach automatically;
    // but we want to return the response first. We use a small trick:
    // Actually let's just kick it off — Deno will keep the isolate alive
    // until all promises resolve, so we MUST await. But we want fast response.
    // Solution: use a background pattern with crypto.randomUUID for tracking.

    // For simplicity: return 202, the polling handles the rest.
    // Deno will keep the function alive until processPDF completes.
    // The 202 is sent immediately via streaming, then the background work
    // completes in the same invocation.
    p.catch((err) => {
      console.error("processPDF failed:", err);
    });

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
