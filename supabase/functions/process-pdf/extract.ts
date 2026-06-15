// extract.ts — PDF text extraction using pdf-parse
// Runs in Deno (Supabase Edge Function)

// pdf-parse uses a Node-compatible Buffer; we polyfill via a simple helper.
// The pdf-parse package expects a Buffer, which Deno provides.

// @ts-ignore: pdf-parse types
import pdfParse from "pdf-parse";

export async function extractText(
  pdfBuffer: ArrayBuffer,
): Promise<{ text: string; pageCount: number }> {
  // Convert ArrayBuffer to Uint8Array (Deno-compatible)
  const data = new Uint8Array(pdfBuffer);

  const result = await pdfParse(data, {
    // Disable version check to avoid extra processing
    // pdf-parse tries to read the PDF version from the first line
  });

  const text = result.text?.trim() ?? "";
  const pageCount = result.numpages ?? 0;

  if (!text) {
    throw new NoTextExtractedError();
  }

  // Add page markers if pdf-parse provides per-page text
  // (pdf-parse already merges pages, so we just return the clean text)
  return { text, pageCount };
}

export class NoTextExtractedError extends Error {
  constructor() {
    super(
      "No extractable text found in this PDF. " +
        "This tool works best with text-heavy lecture PDFs. " +
        "Image-only or scanned PDFs are not supported.",
    );
    this.name = "NoTextExtractedError";
  }
}

export function getWordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
