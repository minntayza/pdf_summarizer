#!/usr/bin/env python3
"""
Smart PDF Lecture Summarizer — Flask Web App
Supports: Google Gemini API  •  Anthropic Claude API

Run:
    pip install -r requirements.txt
    python app.py
Open http://localhost:5001
"""

import json
import os
import time
import threading
import uuid
from pathlib import Path

from flask import Flask, request, jsonify, render_template_string
from flask_cors import CORS

from config import CHUNK_SIZE, OUTPUT_DIR
from pdf_reader import (
    extract_text, get_page_count,
    NoTextExtractedError, EncryptedPDFError, InvalidFileTypeError,
)
from prompts import SYSTEM_PROMPT, build_user_prompt, LectureOutput

# ── Flask setup ────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 50 * 1024 * 1024  # 50 MB max upload size
CORS(app)

UPLOAD_FOLDER = Path("uploads")
UPLOAD_FOLDER.mkdir(exist_ok=True)
OUTPUT_PATH = Path(OUTPUT_DIR)
OUTPUT_PATH.mkdir(exist_ok=True)

jobs: dict[str, dict] = {}
jobs_lock = threading.Lock()

# ── Provider: Gemini ───────────────────────────────────────────────────────────
GEMINI_MODEL = "gemini-1.5-flash"

def call_gemini(api_key: str, text: str) -> dict:
    from google import genai
    from google.genai import types as genai_types
    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=build_user_prompt(text),
        config=genai_types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            max_output_tokens=8192,
        ),
    )
    return _parse_json(response.text)


# ── Provider: Claude ───────────────────────────────────────────────────────────
CLAUDE_MODEL = "claude-sonnet-4-6"

def call_claude(api_key: str, text: str) -> dict:
    from anthropic import Anthropic
    base_url = os.environ.get("ANTHROPIC_BASE_URL")
    client = Anthropic(api_key=api_key, base_url=base_url) if base_url else Anthropic(api_key=api_key)
    response = client.messages.create(
        model=CLAUDE_MODEL,
        max_tokens=8192,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": build_user_prompt(text)}],
    )
    return _parse_json(response.content[0].text)


# ── Shared helpers ─────────────────────────────────────────────────────────────
def _parse_json(raw: str) -> dict:
    if "```json" in raw:
        raw = raw.split("```json")[1].split("```")[0].strip()
    elif "```" in raw:
        raw = raw.split("```")[1].strip()
    return json.loads(raw)


def _call(provider: str, api_key: str, text: str) -> dict:
    if provider == "claude":
        return call_claude(api_key, text)
    return call_gemini(api_key, text)


def process_pdf_text(provider: str, api_key: str, text: str, job_id: str) -> LectureOutput:
    def upd(msg: str, pct: int):
        with jobs_lock:
            jobs[job_id]["progress_msg"] = msg
            jobs[job_id]["progress"] = pct

    label = "Claude" if provider == "claude" else "Gemini"

    if len(text) <= CHUNK_SIZE:
        upd(f"Sending to {label} AI…", 50)
        data = _call(provider, api_key, text)
        try:
            return LectureOutput(**data)
        except Exception:
            upd(f"Retrying with {label} AI…", 60)
            data = _call(provider, api_key, text)
            return LectureOutput(**data)

    # Large PDF — split by pages
    pages = text.split("\n[Page ")
    chunks, current, current_len = [], [], 0
    for page_text in pages:
        page_len = len(page_text)
        if current_len + page_len > CHUNK_SIZE and current:
            chunks.append("\n[Page ".join(current))
            current, current_len = [page_text], page_len
        else:
            current.append(page_text)
            current_len += page_len
    if current:
        chunks.append("\n[Page ".join(current))

    merged = LectureOutput(summary="", key_points="", flashcards=[])
    for i, chunk in enumerate(chunks, 1):
        upd(f"Processing chunk {i}/{len(chunks)} with {label}…", 40 + int(i / len(chunks) * 50))
        try:
            data = _call(provider, api_key, chunk)
            r = LectureOutput(**data)
            merged.summary    += f"\n\n## Part {i}\n\n{r.summary}"
            merged.key_points += f"\n\n### Part {i}\n\n{r.key_points}"
            merged.flashcards.extend(r.flashcards)
        except Exception:
            pass
    return merged


def write_output(pdf_name: str, provider: str, result: LectureOutput) -> dict:
    stem = Path(pdf_name).stem.replace(" ", "_").replace("/", "_")
    out_folder = OUTPUT_PATH / stem
    out_folder.mkdir(parents=True, exist_ok=True)

    seen, unique_fc = set(), []
    for fc in result.flashcards:
        q = fc.question.strip().lower()
        if q not in seen:
            seen.add(q)
            unique_fc.append(fc)

    date_str = time.strftime("%Y-%m-%d")
    title = Path(pdf_name).stem
    label = "Claude" if provider == "claude" else "Gemini"

    (out_folder / "summary.md").write_text(
        f"# {title} — Summary\n\n{result.summary.strip()}\n\n---\n> Generated by Smart PDF Summarizer ({label}) on {date_str}\n",
        encoding="utf-8",
    )
    (out_folder / "key_points.md").write_text(
        f"# {title} — Key Exam Points\n\n{result.key_points.strip()}\n\n---\n> Generated by Smart PDF Summarizer ({label}) on {date_str}\n",
        encoding="utf-8",
    )
    fc_lines = [f"# {title} — Flashcards\n"]
    for i, fc in enumerate(unique_fc, 1):
        fc_lines.append(f"\n## Flashcard {i}\n**Q:** {fc.question}\n**A:** {fc.answer}\n")
    fc_lines.append(f"\n---\n> Generated by Smart PDF Summarizer ({label}) on {date_str}\n")
    (out_folder / "flashcards.md").write_text("".join(fc_lines), encoding="utf-8")

    return {
        "provider": label,
        "folder": str(out_folder),
        "summary": result.summary.strip(),
        "key_points": result.key_points.strip(),
        "flashcards": [{"question": fc.question, "answer": fc.answer} for fc in unique_fc],
        "flashcard_count": len(unique_fc),
    }


# ── Background job ─────────────────────────────────────────────────────────────
def run_job(job_id: str, pdf_path: str, pdf_name: str, provider: str, api_key: str):
    def upd(msg: str, pct: int):
        with jobs_lock:
            jobs[job_id]["progress_msg"] = msg
            jobs[job_id]["progress"] = pct

    try:
        upd("Reading PDF…", 10)
        text = extract_text(pdf_path)
        page_count = get_page_count(pdf_path)
        word_count = len(text.split())
        with jobs_lock:
            jobs[job_id]["page_count"] = page_count
            jobs[job_id]["word_count"] = word_count
        upd(f"Extracted {page_count} pages, ~{word_count:,} words", 30)

        result = process_pdf_text(provider, api_key, text, job_id)

        upd("Writing output files…", 90)
        output = write_output(pdf_name, provider, result)

        with jobs_lock:
            jobs[job_id].update({"status": "done", "progress": 100,
                                 "progress_msg": "Complete!", "result": output})
    except (InvalidFileTypeError, EncryptedPDFError, NoTextExtractedError,
            FileNotFoundError, RuntimeError) as e:
        with jobs_lock:
            jobs[job_id].update({"status": "error", "error": str(e)})
    except Exception as e:
        with jobs_lock:
            jobs[job_id].update({"status": "error", "error": f"Unexpected error: {e}"})
    finally:
        try:
            Path(pdf_path).unlink(missing_ok=True)
        except Exception:
            pass


# ── Routes ─────────────────────────────────────────────────────────────────────
@app.route("/")
def index():
    return render_template_string(HTML_PAGE)


@app.route("/env-hint")
def env_hint():
    return jsonify({
        "has_gemini": bool(os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")),
        "has_claude": bool(os.environ.get("ANTHROPIC_API_KEY")),
    })


@app.route("/upload", methods=["POST"])
def upload():
    provider = request.form.get("provider", "gemini").strip().lower()
    if provider not in ("gemini", "claude"):
        provider = "gemini"

    api_key = (request.form.get("api_key") or "").strip()
    if not api_key:
        env_key = ("GEMINI_API_KEY" if provider == "gemini" else "ANTHROPIC_API_KEY")
        api_key = os.environ.get(env_key) or os.environ.get("GOOGLE_API_KEY", "")
    if not api_key:
        pname = "Gemini" if provider == "gemini" else "Claude"
        return jsonify({"error": f"No {pname} API key provided."}), 400

    if "pdf" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400
    file = request.files["pdf"]
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        return jsonify({"error": "Please upload a PDF file (.pdf)"}), 400

    job_id = str(uuid.uuid4())
    save_path = UPLOAD_FOLDER / f"{job_id}_{file.filename}"
    file.save(str(save_path))

    with jobs_lock:
        jobs[job_id] = {
            "status": "running", "progress": 0,
            "progress_msg": "Starting…", "filename": file.filename,
            "provider": provider, "result": None, "error": None,
            "page_count": None, "word_count": None,
        }

        thread = threading.Thread(
        target=run_job,
        args=(job_id, str(save_path), file.filename, provider, api_key),
        daemon=False,  # Non-daemon: survives graceful shutdown until work completes
    )
    thread.start()

    return jsonify({"job_id": job_id})


@app.route("/status/<job_id>")
def status(job_id: str):
    with jobs_lock:
        job = jobs.get(job_id)
    if not job:
        return jsonify({"error": "Job not found"}), 404
    return jsonify(job)


# ── Single-page UI ─────────────────────────────────────────────────────────────
HTML_PAGE = r"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>Smart PDF Lecture Summarizer · AI Study Tool</title>
<meta name="description" content="Transform any lecture PDF into study notes, key exam points, and flashcards — powered by Google Gemini or Anthropic Claude AI."/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin/>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet"/>
<style>
:root {
  --bg:      #080a10;
  --surf:    #0f1117;
  --surf2:   #161a23;
  --border:  #1e2233;
  --border2: #2a2f45;
  --gem:     #4f8ef7;
  --gem2:    #7c5fe6;
  --cla:     #d4783e;
  --cla2:    #c45c8a;
  --accent:  var(--gem);
  --accent2: var(--gem2);
  --green:   #34d399;
  --red:     #f87171;
  --text:    #e8eaf0;
  --muted:   #7080a0;
  --dim:     #3a4060;
  --r:       14px;
  --rs:      8px;
}
*,*::before,*::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: 'Inter', sans-serif;
  background: var(--bg); color: var(--text);
  min-height: 100vh; overflow-x: hidden;
}
body::before {
  content: ''; position: fixed; inset: 0;
  background:
    radial-gradient(ellipse 80% 55% at 15% 0%, rgba(79,142,247,.09) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 85% 100%, rgba(124,95,230,.08) 0%, transparent 60%);
  pointer-events: none; z-index: 0;
}
body.claude-mode::before {
  background:
    radial-gradient(ellipse 80% 55% at 15% 0%, rgba(212,120,62,.09) 0%, transparent 60%),
    radial-gradient(ellipse 60% 50% at 85% 100%, rgba(196,92,138,.08) 0%, transparent 60%);
}

.wrap { position: relative; z-index: 1; max-width: 900px; margin: 0 auto; padding: 44px 20px 90px; }

/* ── Header ── */
header { text-align: center; margin-bottom: 52px; }
.badge {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(79,142,247,.1); border: 1px solid rgba(79,142,247,.22);
  border-radius: 99px; padding: 5px 15px;
  font-size: 11.5px; font-weight: 700; letter-spacing: .05em;
  color: var(--gem); margin-bottom: 22px; transition: all .3s;
}
.badge svg { width: 13px; height: 13px; }
h1 {
  font-size: clamp(2rem,5vw,3.1rem); font-weight: 800;
  line-height: 1.12; letter-spacing: -.03em;
  background: linear-gradient(140deg, #fff 35%, var(--accent) 75%);
  -webkit-background-clip: text; -webkit-text-fill-color: transparent;
  background-clip: text; margin-bottom: 14px; transition: background .3s;
}
.subtitle { color: var(--muted); font-size: .97rem; max-width: 520px; margin: 0 auto; line-height: 1.65; }

/* ── Cards ── */
.card {
  background: var(--surf); border: 1px solid var(--border);
  border-radius: var(--r); padding: 32px;
  box-shadow: 0 4px 32px rgba(0,0,0,.5); margin-bottom: 20px;
}

/* ── Provider Toggle ── */
.provider-label {
  font-size: .72rem; font-weight: 700; letter-spacing: .07em;
  text-transform: uppercase; color: var(--muted); margin-bottom: 12px;
  display: block;
}
.provider-toggle {
  display: flex; gap: 10px; margin-bottom: 28px;
}
.prov-btn {
  flex: 1; padding: 14px 16px; border-radius: var(--r);
  border: 2px solid var(--border2); background: var(--surf2);
  cursor: pointer; transition: all .22s ease; text-align: center;
  font-family: inherit;
}
.prov-btn .prov-icon {
  font-size: 1.5rem; margin-bottom: 6px; display: block;
  filter: grayscale(1) opacity(.5); transition: filter .22s;
}
.prov-btn .prov-name {
  font-size: .85rem; font-weight: 700; color: var(--muted);
  transition: color .22s; display: block;
}
.prov-btn .prov-sub {
  font-size: .72rem; color: var(--dim); display: block; margin-top: 2px;
}
.prov-btn:hover { border-color: var(--border2); background: var(--border); }
.prov-btn.active-gem {
  border-color: var(--gem); background: rgba(79,142,247,.07);
  box-shadow: 0 0 20px rgba(79,142,247,.12);
}
.prov-btn.active-gem .prov-icon { filter: none; }
.prov-btn.active-gem .prov-name { color: var(--gem); }
.prov-btn.active-cla {
  border-color: var(--cla); background: rgba(212,120,62,.07);
  box-shadow: 0 0 20px rgba(212,120,62,.12);
}
.prov-btn.active-cla .prov-icon { filter: none; }
.prov-btn.active-cla .prov-name { color: var(--cla); }

/* ── API Key fields ── */
.api-fields { position: relative; }
.api-field { display: none; }
.api-field.show { display: block; }
.field { margin-bottom: 22px; }
.field label {
  display: block; font-size: .72rem; font-weight: 700;
  letter-spacing: .07em; text-transform: uppercase;
  color: var(--muted); margin-bottom: 8px;
}
.field input {
  width: 100%; background: var(--surf2); border: 1px solid var(--border2);
  border-radius: var(--rs); padding: 11px 14px; color: var(--text);
  font-family: 'JetBrains Mono', monospace; font-size: .84rem;
  outline: none; transition: border-color .2s;
}
.field input:focus { border-color: var(--accent); }
.field input::placeholder { color: var(--dim); }
.field-hint { font-size: .75rem; color: var(--muted); margin-top: 6px; }
.field-hint a { color: var(--gem); text-decoration: none; }
.field-hint a:hover { text-decoration: underline; }
.field-hint.claude-hint a { color: var(--cla); }

/* ── Drop zone ── */
#drop-zone {
  border: 2px dashed var(--border2); border-radius: var(--r);
  padding: 50px 24px; text-align: center; cursor: pointer;
  transition: all .25s ease; position: relative; overflow: hidden;
}
#drop-zone::after {
  content: ''; position: absolute; inset: 0;
  background: radial-gradient(circle at 50%, rgba(79,142,247,.05), transparent 70%);
  opacity: 0; transition: opacity .3s; pointer-events: none;
}
#drop-zone:hover, #drop-zone.over {
  border-color: var(--accent); background: rgba(79,142,247,.04);
}
#drop-zone:hover::after, #drop-zone.over::after { opacity: 1; }
#drop-zone.over { transform: scale(1.01); }

.drop-icon {
  width: 62px; height: 62px; margin: 0 auto 18px;
  background: linear-gradient(135deg, rgba(79,142,247,.18), rgba(124,95,230,.18));
  border-radius: 16px; display: flex; align-items: center; justify-content: center;
  transition: transform .3s;
}
#drop-zone:hover .drop-icon { transform: translateY(-5px) scale(1.05); }
.drop-icon svg { width: 30px; height: 30px; color: var(--accent); }
.drop-title { font-size: 1rem; font-weight: 600; margin-bottom: 5px; }
.drop-sub { font-size: .86rem; color: var(--muted); margin-bottom: 20px; }

/* ── Buttons ── */
.btn {
  display: inline-flex; align-items: center; gap: 7px; padding: 10px 22px;
  border-radius: var(--rs); font-size: .88rem; font-weight: 600;
  border: none; cursor: pointer; transition: all .2s; font-family: inherit;
}
.btn-primary {
  background: linear-gradient(135deg, var(--accent), var(--accent2));
  color: #fff; box-shadow: 0 4px 18px rgba(79,142,247,.3);
}
.btn-primary:hover { transform: translateY(-2px); box-shadow: 0 8px 26px rgba(79,142,247,.4); }
.btn-primary:active { transform: translateY(0); }
.btn-primary:disabled { opacity: .4; pointer-events: none; }
.btn-ghost { background: var(--surf2); color: var(--text); border: 1px solid var(--border2); }
.btn-ghost:hover { background: var(--border); }
#file-input { display: none; }

/* ── File chip ── */
#file-chip {
  display: none; align-items: center; gap: 10px;
  background: rgba(52,211,153,.07); border: 1px solid rgba(52,211,153,.18);
  border-radius: var(--rs); padding: 10px 14px; margin-top: 14px; font-size: .86rem;
}
#file-chip.show { display: flex; }
#file-chip svg { color: var(--green); flex-shrink: 0; }
.fname { font-weight: 500; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.fsize { color: var(--muted); white-space: nowrap; }
#rm-file { background: none; border: none; color: var(--muted); cursor: pointer; border-radius: 4px; padding: 2px; line-height: 0; }
#rm-file:hover { color: var(--red); }

.submit-row { display: flex; justify-content: flex-end; margin-top: 22px; }

/* ── Progress ── */
#prog-section {
  display: none; background: var(--surf); border: 1px solid var(--border);
  border-radius: var(--r); padding: 28px 30px;
  box-shadow: 0 4px 32px rgba(0,0,0,.5); margin-bottom: 20px;
}
#prog-section.show { display: block; }
.prog-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.prog-name { font-weight: 600; font-size: .93rem; }
.prog-pct { font-weight: 700; color: var(--accent); font-variant-numeric: tabular-nums; }
.bar-track { height: 6px; background: var(--surf2); border-radius: 99px; overflow: hidden; margin-bottom: 13px; }
.bar-fill {
  height: 100%; border-radius: 99px;
  background: linear-gradient(90deg, var(--accent), var(--accent2));
  transition: width .45s ease; box-shadow: 0 0 10px rgba(79,142,247,.5); width: 0%;
}
.prog-msg { font-size: .84rem; color: var(--muted); display: flex; align-items: center; gap: 8px; }
.spinner {
  width: 13px; height: 13px; border: 2px solid var(--border2);
  border-top-color: var(--accent); border-radius: 50%;
  animation: spin .7s linear infinite; flex-shrink: 0;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Error ── */
#err-box {
  display: none; align-items: flex-start; gap: 12px;
  background: rgba(248,113,113,.07); border: 1px solid rgba(248,113,113,.2);
  border-radius: var(--r); padding: 18px 22px; color: var(--red);
  font-size: .88rem; margin-bottom: 20px;
}
#err-box.show { display: flex; }

/* ── Results ── */
#results { display: none; }
#results.show { display: block; }
.res-head {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 22px; flex-wrap: wrap; gap: 12px;
}
.res-title { font-size: 1.15rem; font-weight: 700; display: flex; align-items: center; gap: 10px; }
.dot-ok { width: 10px; height: 10px; background: var(--green); border-radius: 50%; box-shadow: 0 0 8px var(--green); }
.provider-badge {
  font-size: .72rem; font-weight: 700; letter-spacing: .05em;
  padding: 3px 10px; border-radius: 99px; margin-left: 4px;
}
.pb-gem { background: rgba(79,142,247,.15); color: var(--gem); border: 1px solid rgba(79,142,247,.25); }
.pb-cla { background: rgba(212,120,62,.15); color: var(--cla); border: 1px solid rgba(212,120,62,.25); }

/* Stats */
.stats { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 26px; }
.stat {
  background: var(--surf2); border: 1px solid var(--border);
  border-radius: 99px; padding: 6px 14px; font-size: .79rem; color: var(--muted);
  display: flex; align-items: center; gap: 5px;
}
.stat strong { color: var(--text); }

/* Tabs */
.tabs {
  display: flex; gap: 3px; margin-bottom: 18px;
  padding: 4px; background: var(--surf2); border-radius: var(--rs); width: fit-content;
}
.tab {
  padding: 8px 18px; border-radius: 6px; border: none; background: none;
  color: var(--muted); font-size: .875rem; font-weight: 500; cursor: pointer;
  transition: all .18s; font-family: inherit;
}
.tab.on { background: var(--surf); color: var(--text); box-shadow: 0 2px 8px rgba(0,0,0,.35); }
.tab:hover:not(.on) { color: var(--text); }
.panel { display: none; }
.panel.on { display: block; }

/* Markdown card */
.md {
  background: var(--surf); border: 1px solid var(--border);
  border-radius: var(--r); padding: 28px;
  box-shadow: 0 4px 28px rgba(0,0,0,.45); line-height: 1.72; font-size: .9rem;
}
.md h2, .md h3 { margin: 20px 0 8px; color: var(--text); }
.md h2:first-child, .md h3:first-child { margin-top: 0; }
.md ul, .md ol { padding-left: 1.4rem; }
.md li { margin: 4px 0; }
.md strong { color: var(--accent); }
.md em { color: var(--muted); }
.md p { margin: 8px 0; }
.md hr { border: none; border-top: 1px solid var(--border); margin: 20px 0; }
.md blockquote { border-left: 3px solid var(--border2); padding-left: 12px; color: var(--muted); font-size: .84rem; margin: 12px 0; }

/* Flashcards */
.fc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(270px, 1fr)); gap: 14px; }
.fc {
  background: var(--surf); border: 1px solid var(--border);
  border-radius: var(--r); padding: 20px; cursor: pointer;
  transition: all .22s ease; position: relative; min-height: 120px;
}
.fc:hover { border-color: var(--accent); transform: translateY(-3px); box-shadow: 0 0 32px rgba(79,142,247,.1); }
.fc .lbl { font-size: .68rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--accent); margin-bottom: 8px; }
.fc .q { font-size: .875rem; font-weight: 500; line-height: 1.55; }
.fc .a { display: none; margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); font-size: .875rem; color: var(--green); line-height: 1.55; }
.fc.flip .a { display: block; }
.fc.flip .lbl { color: var(--green); }
.fc-hint { position: absolute; bottom: 9px; right: 12px; font-size: .68rem; color: var(--dim); }

footer { text-align: center; margin-top: 60px; color: var(--dim); font-size: .78rem; }
footer a { color: var(--muted); text-decoration: none; }
footer a:hover { color: var(--text); }

@media (max-width: 600px) {
  .card, .md { padding: 20px; }
  #drop-zone { padding: 36px 16px; }
  .fc-grid { grid-template-columns: 1fr; }
  h1 { font-size: 1.9rem; }
  .provider-toggle { flex-direction: column; }
}
</style>
</head>
<body id="body">
<div class="wrap">

<!-- ── Header ── -->
<header>
  <div class="badge" id="header-badge">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
    <span id="badge-text">Powered by Google Gemini AI</span>
  </div>
  <h1>Smart PDF Lecture<br/>Summarizer</h1>
  <p class="subtitle">Upload any lecture PDF and instantly get AI-generated study notes, prioritized exam points, and interactive flashcards.</p>
</header>

<!-- ── Upload Card ── -->
<div class="card" id="upload-card">

  <!-- Provider Toggle -->
  <span class="provider-label">Choose AI Provider</span>
  <div class="provider-toggle">
    <button class="prov-btn active-gem" id="btn-gem" onclick="setProvider('gemini')">
      <span class="prov-icon">✨</span>
      <span class="prov-name">Google Gemini</span>
      <span class="prov-sub">gemini-1.5-flash</span>
    </button>
    <button class="prov-btn" id="btn-cla" onclick="setProvider('claude')">
      <span class="prov-icon">🤖</span>
      <span class="prov-name">Anthropic Claude</span>
      <span class="prov-sub">claude-sonnet-4-6</span>
    </button>
  </div>

  <!-- API Key (Gemini) -->
  <div class="api-fields">
    <div class="api-field show" id="field-gem">
      <div class="field">
        <label>Gemini API Key</label>
        <input type="password" id="api-key-gem" placeholder="AIza…" autocomplete="off"/>
        <p class="field-hint">Free key at <a href="https://aistudio.google.com/apikey" target="_blank">aistudio.google.com/apikey</a></p>
      </div>
    </div>
    <div class="api-field" id="field-cla">
      <div class="field">
        <label>Claude API Key</label>
        <input type="password" id="api-key-cla" placeholder="sk-ant-…" autocomplete="off"/>
        <p class="field-hint claude-hint">Get a key at <a href="https://console.anthropic.com" target="_blank">console.anthropic.com</a></p>
      </div>
    </div>
  </div>

  <!-- Drop Zone -->
  <div id="drop-zone" tabindex="0" role="button" aria-label="Upload PDF">
    <div class="drop-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
    </div>
    <div class="drop-title">Drop your lecture PDF here</div>
    <div class="drop-sub">or click to browse</div>
    <button class="btn btn-primary" type="button" onclick="document.getElementById('file-input').click()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>
      Choose PDF
    </button>
    <input type="file" id="file-input" accept=".pdf"/>
  </div>

  <!-- File chip -->
  <div id="file-chip">
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
    <span class="fname" id="chip-name"></span>
    <span class="fsize" id="chip-size"></span>
    <button id="rm-file" title="Remove" aria-label="Remove file">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
    </button>
  </div>

  <div class="submit-row">
    <button class="btn btn-primary" id="submit-btn" disabled>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
      Analyze PDF
    </button>
  </div>
</div>

<!-- ── Progress ── -->
<div id="prog-section">
  <div class="prog-head">
    <span class="prog-name" id="prog-name">Processing…</span>
    <span class="prog-pct" id="prog-pct">0%</span>
  </div>
  <div class="bar-track"><div class="bar-fill" id="bar"></div></div>
  <div class="prog-msg">
    <div class="spinner"></div>
    <span id="prog-msg">Starting…</span>
  </div>
</div>

<!-- ── Error ── -->
<div id="err-box">
  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;margin-top:1px"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  <span id="err-text"></span>
</div>

<!-- ── Results ── -->
<div id="results">
  <div class="res-head">
    <div class="res-title">
      <div class="dot-ok"></div>
      Analysis Complete
      <span class="provider-badge pb-gem" id="result-badge">Gemini</span>
    </div>
    <button class="btn btn-ghost" onclick="doReset()">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.15"/></svg>
      New PDF
    </button>
  </div>

  <div class="stats" id="stats"></div>

  <div class="tabs">
    <button class="tab on" onclick="switchTab('summary',this)">📋 Summary</button>
    <button class="tab" onclick="switchTab('keypoints',this)">🎯 Key Points</button>
    <button class="tab" onclick="switchTab('flashcards',this)">🃏 Flashcards</button>
  </div>

  <div class="panel on" id="p-summary"><div class="md" id="c-summary"></div></div>
  <div class="panel" id="p-keypoints"><div class="md" id="c-keypoints"></div></div>
  <div class="panel" id="p-flashcards">
    <p style="font-size:.83rem;color:var(--muted);margin-bottom:14px">👆 Tap a card to reveal the answer</p>
    <div class="fc-grid" id="c-flashcards"></div>
  </div>
</div>

<footer>
  Built with ❤️ &nbsp;·&nbsp;
  <a href="https://ai.google.dev" target="_blank">Google Gemini</a>
  &nbsp;·&nbsp;
  <a href="https://anthropic.com" target="_blank">Anthropic Claude</a>
</footer>
</div>

<script>
// ── State ──────────────────────────────────────────────────────────
let selFile = null, poll = null, provider = 'gemini';

const $ = id => document.getElementById(id);
const fileInput = $('file-input');
const submitBtn = $('submit-btn');

// ── Provider toggle ────────────────────────────────────────────────
function setProvider(p) {
  provider = p;
  const isGem = p === 'gemini';

  // Buttons
  $('btn-gem').className = 'prov-btn' + (isGem ? ' active-gem' : '');
  $('btn-cla').className = 'prov-btn' + (!isGem ? ' active-cla' : '');

  // API fields
  $('field-gem').classList.toggle('show', isGem);
  $('field-cla').classList.toggle('show', !isGem);

  // Header badge & colours
  const badge = $('header-badge');
  const badgeText = $('badge-text');
  if (isGem) {
    badge.style.cssText = 'background:rgba(79,142,247,.1);border-color:rgba(79,142,247,.22);color:#4f8ef7';
    badgeText.textContent = 'Powered by Google Gemini AI';
    document.body.classList.remove('claude-mode');
    document.documentElement.style.setProperty('--accent', 'var(--gem)');
    document.documentElement.style.setProperty('--accent2', 'var(--gem2)');
  } else {
    badge.style.cssText = 'background:rgba(212,120,62,.1);border-color:rgba(212,120,62,.22);color:#d4783e';
    badgeText.textContent = 'Powered by Anthropic Claude AI';
    document.body.classList.add('claude-mode');
    document.documentElement.style.setProperty('--accent', 'var(--cla)');
    document.documentElement.style.setProperty('--accent2', 'var(--cla2)');
  }

  // Drop zone icon colour follows CSS var automatically
  checkBtn();
}

// ── Utilities ──────────────────────────────────────────────────────
const fmt = b => b < 1024 ? b+'B' : b < 1048576 ? (b/1024).toFixed(1)+'KB' : (b/1048576).toFixed(2)+'MB';
const esc = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function currentKey() {
  return (provider === 'gemini' ? $('api-key-gem') : $('api-key-cla')).value.trim();
}
function checkBtn() { submitBtn.disabled = !(selFile && currentKey()); }

$('api-key-gem').addEventListener('input', checkBtn);
$('api-key-cla').addEventListener('input', checkBtn);

// ── File selection ─────────────────────────────────────────────────
function setFile(f) {
  if (!f || !f.name.toLowerCase().endsWith('.pdf')) { alert('Please choose a PDF file.'); return; }
  selFile = f;
  $('chip-name').textContent = f.name;
  $('chip-size').textContent = fmt(f.size);
  $('file-chip').classList.add('show');
  checkBtn();
}

fileInput.addEventListener('change', () => fileInput.files[0] && setFile(fileInput.files[0]));
$('rm-file').addEventListener('click', e => {
  e.stopPropagation(); selFile = null; fileInput.value = '';
  $('file-chip').classList.remove('show'); checkBtn();
});

const dz = $('drop-zone');
dz.addEventListener('click', () => fileInput.click());
dz.addEventListener('keydown', e => (e.key==='Enter'||e.key===' ') && fileInput.click());
dz.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('over'); });
dz.addEventListener('dragleave', () => dz.classList.remove('over'));
dz.addEventListener('drop', e => {
  e.preventDefault(); dz.classList.remove('over');
  e.dataTransfer.files[0] && setFile(e.dataTransfer.files[0]);
});

// ── Submit ─────────────────────────────────────────────────────────
submitBtn.addEventListener('click', async () => {
  if (!selFile || !currentKey()) return;
  $('upload-card').style.display = 'none';
  $('prog-section').classList.add('show');
  $('err-box').classList.remove('show');
  $('results').classList.remove('show');
  $('prog-name').textContent = selFile.name;

  const fd = new FormData();
  fd.append('pdf', selFile);
  fd.append('api_key', currentKey());
  fd.append('provider', provider);

  try {
    const res = await fetch('/upload', { method:'POST', body:fd });
    const d = await res.json();
    if (!res.ok) throw new Error(d.error || 'Upload failed');
    startPoll(d.job_id);
  } catch(err) { showErr(err.message); }
});

// ── Poll ───────────────────────────────────────────────────────────
function startPoll(id) {
  poll = setInterval(async () => {
    try {
      const j = await (await fetch('/status/'+id)).json();
      $('prog-pct').textContent = j.progress + '%';
      $('bar').style.width = j.progress + '%';
      $('prog-msg').textContent = j.progress_msg || '…';
      if (j.status === 'done')  { clearInterval(poll); showResults(j); }
      if (j.status === 'error') { clearInterval(poll); showErr(j.error || 'Unknown error'); }
    } catch { clearInterval(poll); showErr('Lost connection.'); }
  }, 900);
}

// ── Show results ───────────────────────────────────────────────────
function showResults(j) {
  $('prog-section').classList.remove('show');
  const r = j.result;
  const isGem = (r.provider || '').toLowerCase().includes('gemini');

  // Provider badge
  const rb = $('result-badge');
  rb.textContent = r.provider || (isGem ? 'Gemini' : 'Claude');
  rb.className = 'provider-badge ' + (isGem ? 'pb-gem' : 'pb-cla');

  // Stats
  let st = '';
  if (j.page_count)     st += pill('📄','Pages',j.page_count);
  if (j.word_count)     st += pill('📝','Words',j.word_count.toLocaleString());
  if (r.flashcard_count) st += pill('🃏','Flashcards',r.flashcard_count);
  $('stats').innerHTML = st;

  $('c-summary').innerHTML   = md2html(r.summary);
  $('c-keypoints').innerHTML = md2html(r.key_points);

  const grid = $('c-flashcards');
  grid.innerHTML = '';
  r.flashcards.forEach((fc, i) => {
    const d = document.createElement('div');
    d.className = 'fc';
    d.innerHTML = `<div class="lbl">Question ${i+1}</div>
      <div class="q">${esc(fc.question)}</div>
      <div class="a">${esc(fc.answer)}</div>
      <div class="fc-hint">click to flip</div>`;
    d.addEventListener('click', () => d.classList.toggle('flip'));
    grid.appendChild(d);
  });

  $('results').classList.add('show');
  $('results').scrollIntoView({ behavior:'smooth', block:'start' });
}

function pill(icon, label, val) {
  return `<div class="stat">${icon} ${label}: <strong>${val}</strong></div>`;
}

// ── Error / Reset ──────────────────────────────────────────────────
function showErr(msg) {
  $('prog-section').classList.remove('show');
  $('upload-card').style.display = '';
  $('err-text').textContent = msg;
  $('err-box').classList.add('show');
}

function doReset() {
  clearInterval(poll);
  selFile = null; fileInput.value = '';
  $('file-chip').classList.remove('show'); checkBtn();
  $('upload-card').style.display = '';
  $('prog-section').classList.remove('show');
  $('err-box').classList.remove('show');
  $('results').classList.remove('show');
  switchTab('summary', document.querySelector('.tab'));
  window.scrollTo({ top: 0, behavior:'smooth' });
}

// ── Tabs ───────────────────────────────────────────────────────────
function switchTab(name, el) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
  el.classList.add('on');
  $('p-'+name).classList.add('on');
}

// ── Markdown → HTML ────────────────────────────────────────────────
function md2html(md) {
  if (!md) return '';
  let s = md
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/^### (.+)$/gm,'<h3>$1</h3>')
    .replace(/^## (.+)$/gm,'<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/\*(.+?)\*/g,'<em>$1</em>')
    .replace(/^---$/gm,'<hr/>')
    .replace(/^> (.+)$/gm,'<blockquote>$1</blockquote>')
    .replace(/^[-•*] (.+)$/gm,'<li>$1</li>');
  s = s.replace(/(<li>[^]*?<\/li>\n?)+/g, m => '<ul>'+m+'</ul>');
  s = s.split(/\n{2,}/).map(b => {
    b = b.trim();
    if (!b) return '';
    if (/^<(h[23]|ul|hr|blockquote)/.test(b)) return b;
    return '<p>'+b.replace(/\n/g,'<br/>')+'</p>';
  }).join('');
  return s;
}

// ── Env hint: pre-fill placeholder if server key exists ────────────
fetch('/env-hint').then(r=>r.json()).then(d=>{
  if (d.has_gemini) $('api-key-gem').placeholder = 'Key loaded from environment ✓';
  if (d.has_claude) $('api-key-cla').placeholder = 'Key loaded from environment ✓';
}).catch(()=>{});
</script>
</body>
</html>"""


# ── Entry point ────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5001))
    print("\n🚀  Smart PDF Lecture Summarizer")
    print(f"   Open → http://localhost:{port}")
    print("   Supports: Google Gemini  •  Anthropic Claude")
    print("   Press Ctrl+C to stop.\n")
    app.run(host="0.0.0.0", port=port, debug=False)
