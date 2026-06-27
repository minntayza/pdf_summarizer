-- ============================================================
-- 008: Daily Study Streaks + Full-Text Search
-- ============================================================

-- ── User Streaks ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS user_streaks (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;

-- Users can read their own streak
CREATE POLICY "Users can read own streak" ON user_streaks
  FOR SELECT USING (auth.uid() = user_id);

-- Only the streak-update function can write (no direct insert/update)
CREATE POLICY "Users can upsert own streak" ON user_streaks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own streak" ON user_streaks
  FOR UPDATE USING (auth.uid() = user_id);

-- ── Full-Text Search on documents ───────────────────────────

-- summary_text must exist before search_vector population
ALTER TABLE documents ADD COLUMN IF NOT EXISTS summary_text TEXT;

-- Add a tsvector column for full-text search
ALTER TABLE documents ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create a GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_documents_search_vector ON documents USING GIN (search_vector);

-- Function to update the search vector from document fields
CREATE OR REPLACE FUNCTION documents_search_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.filename, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary_text, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to keep search_vector updated
DROP TRIGGER IF EXISTS trg_documents_search_vector ON documents;
CREATE TRIGGER trg_documents_search_vector
  BEFORE INSERT OR UPDATE OF filename, summary_text ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_search_update();

-- Populate search_vector for existing rows
UPDATE documents SET search_vector =
  setweight(to_tsvector('english', COALESCE(filename, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(summary_text, '')), 'B');
