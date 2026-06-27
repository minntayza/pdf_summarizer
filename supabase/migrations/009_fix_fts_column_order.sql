-- ============================================================
-- 009: Fix FTS columns (008 had summary_text added after UPDATE)
-- ============================================================

-- summary_text must exist before search_vector population
ALTER TABLE documents ADD COLUMN IF NOT EXISTS summary_text TEXT;

ALTER TABLE documents ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE INDEX IF NOT EXISTS idx_documents_search_vector ON documents USING GIN (search_vector);

CREATE OR REPLACE FUNCTION documents_search_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.filename, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.summary_text, '')), 'B');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_documents_search_vector ON documents;
CREATE TRIGGER trg_documents_search_vector
  BEFORE INSERT OR UPDATE OF filename, summary_text ON documents
  FOR EACH ROW EXECUTE FUNCTION documents_search_update();

UPDATE documents SET search_vector =
  setweight(to_tsvector('english', COALESCE(filename, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(summary_text, '')), 'B');

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';
