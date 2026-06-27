// index.ts — Supabase Edge Function: POST /chat-pdf
//
// Handles chat messages about a PDF document.
// Re-extracts text from the stored PDF and uses it as context.
//
// Deploy: supabase functions deploy chat-pdf

import { createClient } from "@supabase/supabase-js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function corsResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

async function getUserId(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data } = await supabase.auth.getUser();
  return data?.user?.id ?? null;
}

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("Claude API key not configured");

  const rawBase = Deno.env.get("ANTHROPIC_BASE_URL") || "https://api.anthropic.com";
  const baseUrl = rawBase.replace(/\/v1\/?$/, "");
  const model = Deno.env.get("CLAUDE_MODEL") || "claude-sonnet-4-6";

  const resp = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Claude API error (${resp.status}): ${(err as Record<string, unknown>)?.error?.message || resp.statusText}`);
  }

  const data = await resp.json();
  return data?.content?.[0]?.text ?? "I couldn't generate a response.";
}

async function callGemini(systemPrompt: string, userMessage: string): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("Gemini API key not configured");

  const model = Deno.env.get("GEMINI_MODEL") || "gemini-1.5-flash";

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: [{ text: userMessage }] }],
        generationConfig: { maxOutputTokens: 2048 },
      }),
    },
  );

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(`Gemini API error (${resp.status}): ${JSON.stringify(err)}`);
  }

  const data = await resp.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "I couldn't generate a response.";
}

// Truncate text to fit within context window
function truncateText(text: string, maxChars: number = 100000): string {
  if (text.length <= maxChars) return text;
  return text.slice(0, maxChars) + "\n\n[... text truncated for length ...]";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return corsResponse({ error: "Method not allowed" }, 405);
  }

  const userId = await getUserId(req);
  if (!userId) return corsResponse({ error: "Authentication required" }, 401);

  let body: { document_id?: string; message?: string };
  try {
    body = await req.json();
  } catch {
    return corsResponse({ error: "Invalid JSON body" }, 400);
  }

  const { document_id, message } = body;
  if (!document_id || !message) {
    return corsResponse({ error: "Missing required fields: document_id, message" }, 400);
  }

  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Fetch document
  const { data: doc, error: docErr } = await supabaseService
    .from("documents")
    .select("*")
    .eq("id", document_id)
    .eq("user_id", userId)
    .single();

  if (docErr || !doc) {
    return corsResponse({ error: "Document not found" }, 404);
  }

  if (doc.status !== "done") {
    return corsResponse({ error: "Document is not ready yet" }, 400);
  }

  // Fetch last 10 chat messages for context
  const { data: history } = await supabaseService
    .from("chat_messages")
    .select("role, content")
    .eq("document_id", document_id)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  const recentHistory = (history || []).reverse();

  // Re-extract PDF text
  let pdfText = "";
  try {
    const pdfPath = doc.pdf_path.replace("pdfs/", "");
    const { data: pdfBlob, error: downloadErr } = await supabaseService.storage
      .from("pdfs")
      .download(pdfPath);

    if (downloadErr || !pdfBlob) {
      throw new Error("Failed to download PDF");
    }

    // Dynamic import of pdf-parse
    const pdfParse = (await import("npm:pdf-parse@1.1.1")).default;
    const buffer = await pdfBlob.arrayBuffer();
    const result = await pdfParse(new Uint8Array(buffer));
    pdfText = result.text;
  } catch (err) {
    console.error("PDF extraction failed:", err);
    return corsResponse({ error: "Failed to read PDF content" }, 500);
  }

  const truncatedText = truncateText(pdfText);

  // Build system prompt
  const systemPrompt = `You are a helpful study assistant. You are helping a student understand a lecture PDF.

The student has already received a summary, key points, and flashcards for this document.
Now they want to ask specific questions about the content.

Be concise, helpful, and educational. If the answer isn't in the PDF, say so honestly.
Respond in the same language the student uses in their question.`;

  // Build conversation context
  let conversationContext = `Lecture PDF content:\n---\n${truncatedText}\n---\n\n`;
  if (recentHistory.length > 0) {
    conversationContext += "Previous conversation:\n";
    for (const msg of recentHistory) {
      conversationContext += `${msg.role === 'user' ? 'Student' : 'Assistant'}: ${msg.content}\n`;
    }
    conversationContext += "\n";
  }
  conversationContext += `Student's question: ${message}`;

  // Call AI
  let response: string;
  try {
    const provider = doc.provider || "claude";
    if (provider === "gemini") {
      response = await callGemini(systemPrompt, conversationContext);
    } else {
      response = await callClaude(systemPrompt, conversationContext);
    }
  } catch (err) {
    console.error("AI call failed:", err);
    return corsResponse({ error: "AI service unavailable. Try again later." }, 503);
  }

  return corsResponse({ response });
});
