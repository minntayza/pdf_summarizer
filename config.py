"""Configuration constants for Smart PDF Lecture Summarizer."""

CHUNK_SIZE = 60000       # characters per chunk (~50 pages)
MAX_RETRIES = 1          # retries on validation failure
OUTPUT_DIR = "output"    # default output directory
DEFAULT_PROVIDER = "claude"  # "claude" or "gemini"

# Per-provider model defaults
CLAUDE_MODEL = "mimo-v2.5-pro"
GEMINI_MODEL = "gemini-1.5-flash"
