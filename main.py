#!/usr/bin/env python3
"""
Smart PDF Lecture Summarizer

Usage:
    python main.py input/lecture.pdf [-o output_dir] [--model MODEL] [--provider claude|gemini]

Place your PDF in the input/ folder, then run this script.
Get summary notes, key exam points, and Q&A flashcards as Markdown files.
"""

import argparse
import json
import os
import sys
import time
from pathlib import Path

from config import (
    CHUNK_SIZE,
    MAX_RETRIES,
    OUTPUT_DIR,
    DEFAULT_PROVIDER,
    CLAUDE_MODEL,
    GEMINI_MODEL,
)
from pdf_reader import (
    extract_text,
    get_page_count,
    NoTextExtractedError,
    EncryptedPDFError,
    InvalidFileTypeError,
)
from prompts import SYSTEM_PROMPT, build_user_prompt, LectureOutput


def sanitize_name(name: str) -> str:
    """Turn a filename into a clean folder name."""
    return Path(name).stem.replace(" ", "_").replace("/", "_")


def call_llm(text: str, model: str, provider: str) -> dict:
    """Send text to either Claude or Gemini and return parsed JSON."""
    if provider == "claude":
        api_key = os.environ.get("ANTHROPIC_API_KEY")
        if not api_key:
            print("❌ ANTHROPIC_API_KEY environment variable is not set.", file=sys.stderr)
            print("   Get a key at https://console.anthropic.com", file=sys.stderr)
            print("   Then: export ANTHROPIC_API_KEY='sk-ant-...'", file=sys.stderr)
            sys.exit(3)

        base_url = os.environ.get("ANTHROPIC_BASE_URL", "https://api.anthropic.com")

        import httpx

        payload = {
            "model": model,
            "max_tokens": 4000,
            "system": SYSTEM_PROMPT,
            "messages": [{"role": "user", "content": build_user_prompt(text)}],
        }

        response = httpx.post(
            f"{base_url}/v1/messages",
            json=payload,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            timeout=300,
        )

        if response.status_code != 200:
            raise RuntimeError(
                f"API returned {response.status_code}: "
                f"{response.json().get('error', {}).get('message', response.text[:500])}"
            )

        data = response.json()
        raw = ""
        for block in data.get("content", []):
            if block.get("type") == "text":
                raw = block["text"]
                break
        if not raw:
            raise ValueError("No text content in Claude response")

    elif provider == "gemini":
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            print("❌ GEMINI_API_KEY environment variable is not set.", file=sys.stderr)
            print("   Get a key at https://aistudio.google.com/apikey", file=sys.stderr)
            print("   Then: export GEMINI_API_KEY='...'", file=sys.stderr)
            sys.exit(3)

        from google import genai

        client = genai.Client(api_key=api_key)
        # Gemini uses the system instruction as a separate parameter
        response = client.models.generate_content(
            model=model,
            contents=build_user_prompt(text),
            config={"system_instruction": SYSTEM_PROMPT},
        )
        raw = response.text

    else:
        print(f"❌ Unknown provider: {provider}. Choose 'claude' or 'gemini'.", file=sys.stderr)
        sys.exit(3)

    # Try to parse JSON — sometimes the model wraps it in markdown fences
    if "```json" in raw:
        raw = raw.split("```json")[1].split("```")[0].strip()
    elif "```" in raw:
        raw = raw.split("```")[1].strip()

    return json.loads(raw)


def process_pdf(text: str, model: str, provider: str, pdf_name: str) -> LectureOutput:
    """Process PDF text through LLM, handling chunking if needed."""
    if len(text) <= CHUNK_SIZE:
        print(f"   → Sending to {provider.capitalize()}...", flush=True)
        data = call_llm(text, model, provider)
        # Validate with Pydantic
        try:
            return LectureOutput(**data)
        except Exception as e:
            print(f"   ⚠ Validation failed: {e}. Retrying once...", flush=True)
            data = call_llm(text, model, provider)
            return LectureOutput(**data)

    # ── Chunking for large PDFs ─────────────────────────────
    pages = text.split("\n[Page ")
    # Reconstruct page groups
    chunks = []
    current = []
    current_len = 0

    for page_text in pages:
        page_len = len(page_text)
        if current_len + page_len > CHUNK_SIZE and current:
            chunks.append("\n[Page ".join(current))
            current = [page_text]
            current_len = page_len
        else:
            current.append(page_text)
            current_len += page_len

    if current:
        chunks.append("\n[Page ".join(current))

    print(f"   ⚠ Large PDF — splitting into {len(chunks)} chunks...", flush=True)

    merged = LectureOutput(summary="", key_points="", flashcards=[])
    skipped_chunks = []

    for i, chunk in enumerate(chunks, start=1):
        print(f"   → Processing chunk {i}/{len(chunks)}...", flush=True)
        result = None
        for attempt in range(2):  # retry once on failure
            try:
                data = call_llm(chunk, model, provider)
                result = LectureOutput(**data)
                break
            except Exception as e:
                if attempt == 1:
                    print(f"   ⚠ Chunk {i} failed after retry: {e}. Skipping.", file=sys.stderr, flush=True)
                    skipped_chunks.append(i)
                else:
                    print(f"   ⚠ Chunk {i} failed, retrying...", flush=True)

        if result is not None:
            merged.summary += f"\n\n## Part {i}\n\n{result.summary}"
            merged.key_points += f"\n\n### Part {i}\n\n{result.key_points}"
            merged.flashcards.extend(result.flashcards)

    if skipped_chunks:
        warning = f"\n\n---\n> ⚠️ Warning: Chunk(s) {', '.join(map(str, skipped_chunks))} could not be processed. Some content may be missing.\n"
        merged.summary += warning
        merged.key_points += warning

    return merged


def write_output(output_dir: Path, pdf_name: str, result: LectureOutput) -> None:
    """Write the three Markdown output files."""
    out_folder = output_dir / sanitize_name(pdf_name)
    out_folder.mkdir(parents=True, exist_ok=True)

    # Deduplicate flashcards by question text
    seen = set()
    unique_flashcards = []
    for fc in result.flashcards:
        q = fc.question.strip().lower()
        if q not in seen:
            seen.add(q)
            unique_flashcards.append(fc)

    date_str = time.strftime("%Y-%m-%d")

    # ── summary.md ──
    summary_text = f"# {Path(pdf_name).stem} — Summary\n\n{result.summary.strip()}\n\n---\n> Generated by Smart PDF Lecture Summarizer on {date_str}\n"
    (out_folder / "summary.md").write_text(summary_text, encoding="utf-8")

    # ── key_points.md ──
    keypoints_text = f"# {Path(pdf_name).stem} — Key Exam Points\n\n{result.key_points.strip()}\n\n---\n> Generated by Smart PDF Lecture Summarizer on {date_str}\n"
    (out_folder / "key_points.md").write_text(keypoints_text, encoding="utf-8")

    # ── flashcards.md ──
    flashcard_lines = [f"# {Path(pdf_name).stem} — Flashcards\n"]
    for i, fc in enumerate(unique_flashcards, start=1):
        flashcard_lines.append(f"\n## Flashcard {i}\n**Q:** {fc.question}\n**A:** {fc.answer}\n")
    flashcard_lines.append(f"\n---\n> Generated by Smart PDF Lecture Summarizer on {date_str}\n")
    (out_folder / "flashcards.md").write_text("".join(flashcard_lines), encoding="utf-8")

    print(f"\n✅ Done! Files saved to {out_folder}/")
    print(f"   ├── summary.md")
    print(f"   ├── key_points.md")
    print(f"   └── flashcards.md")
    print(f"   📊 {len(unique_flashcards)} flashcards generated")


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Smart PDF Lecture Summarizer — turn PDFs into study notes",
        epilog="Examples:\n"
        "  python main.py input/lecture.pdf                          (Claude, default)\n"
        "  python main.py input/lecture.pdf --provider gemini        (Gemini)\n"
        "  python main.py input/lecture.pdf --model claude-sonnet-4-6-20250514  (specific Claude model)",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("input_path", help="Path to the lecture PDF file")
    parser.add_argument(
        "-o", "--output",
        default=OUTPUT_DIR,
        help=f"Output directory (default: {OUTPUT_DIR})",
    )
    parser.add_argument(
        "--provider",
        default=DEFAULT_PROVIDER,
        choices=["claude", "gemini"],
        help=f"AI provider to use (default: {DEFAULT_PROVIDER})",
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Model override (defaults: claude-sonnet-4-6 for Claude, gemini-1.5-flash for Gemini)",
    )
    parser.add_argument("--debug", action="store_true", help="Print raw API output on error")
    args = parser.parse_args()

    input_path = args.input_path
    output_path = Path(args.output)
    provider = args.provider
    model = args.model

    # Resolve model: --model flag takes precedence, then provider default
    if model is None:
        if provider == "claude":
            model = CLAUDE_MODEL
        else:
            model = GEMINI_MODEL

    # Ensure output dir exists
    output_path.mkdir(parents=True, exist_ok=True)

    pdf_name = Path(input_path).name

    try:
        # ── 1. Extract text from PDF ──
        print(f"📄 Reading: {input_path}", flush=True)
        text = extract_text(input_path)
        page_count = get_page_count(input_path)
        word_count = len(text.split())
        print(f"   → {page_count} pages, ~{word_count:,} words extracted", flush=True)

        # ── 2. Call LLM API ──
        print(f"   → Using {provider.capitalize()} ({model})", flush=True)
        result = process_pdf(text, model, provider, pdf_name)

        # ── 3. Write output ──
        write_output(output_path, pdf_name, result)

        sys.exit(0)

    except FileNotFoundError as e:
        print(f"❌ {e}", file=sys.stderr)
        sys.exit(1)
    except InvalidFileTypeError as e:
        print(f"❌ {e}", file=sys.stderr)
        sys.exit(1)
    except NoTextExtractedError as e:
        print(f"❌ {e}", file=sys.stderr)
        sys.exit(2)
    except EncryptedPDFError as e:
        print(f"❌ {e}", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ {provider.capitalize()} returned invalid JSON: {e}", file=sys.stderr)
        sys.exit(4)
    except Exception as e:
        error_msg = str(e).lower()
        if "authentication" in error_msg or "api_key" in error_msg:
            print(f"❌ {provider.capitalize()} API authentication error. Check your API key.", file=sys.stderr)
        elif "timeout" in error_msg or "connection" in error_msg:
            print(f"❌ Network error: {e}. Check your internet connection.", file=sys.stderr)
        elif "rate" in error_msg:
            print(f"❌ API rate limit hit. Wait a moment and try again.", file=sys.stderr)
        else:
            print(f"❌ Unexpected error: {e}", file=sys.stderr)
            if args.debug:
                import traceback
                traceback.print_exc()
        sys.exit(3)


if __name__ == "__main__":
    main()
