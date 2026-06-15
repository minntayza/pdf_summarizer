# Smart PDF Lecture Summarizer

Turn lecture PDFs into **summary notes**, **key exam points**, and **Q&A flashcards** — all from one terminal command. Works with **Claude** or **Gemini**.

## Quick Start

```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Set an API key
export ANTHROPIC_API_KEY="sk-ant-..."    # for Claude (default)
# or
export GEMINI_API_KEY="..."               # for Gemini

# 3. Put a PDF in the input/ folder
cp ~/Downloads/my_lecture.pdf input/

# 4. Run it
python main.py input/my_lecture.pdf

# Or use Gemini instead:
python main.py input/my_lecture.pdf --provider gemini
```

Output appears in `output/my_lecture/`:
- `summary.md` — bullet-point lecture summary
- `key_points.md` — exam predictions + common pitfalls
- `flashcards.md` — Q&A pairs for active recall

## Options

| Flag | Description |
|------|-------------|
| `input_path` | Path to PDF file (positional, required) |
| `-o, --output` | Output directory (default: `output/`) |
| `--provider` | `claude` or `gemini` (default: `claude`) |
| `--model` | Model override (provider-appropriate default used otherwise) |
| `--debug` | Print full traceback on error |

## Requirements

- Python 3.11+
- [Anthropic API key](https://console.anthropic.com) for Claude, or
- [Gemini API key](https://aistudio.google.com/apikey) for Gemini
