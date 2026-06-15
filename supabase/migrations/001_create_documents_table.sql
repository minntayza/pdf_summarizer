-- Documents table: tracks every uploaded PDF and its processing state
CREATE TABLE documents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  filename        TEXT NOT NULL,
  provider        TEXT NOT NULL DEFAULT 'claude',
  status          TEXT NOT NULL DEFAULT 'processing',
  progress        INTEGER NOT NULL DEFAULT 0,
  progress_msg    TEXT NOT NULL DEFAULT 'Starting…',
  pdf_path        TEXT NOT NULL,
  output_prefix   TEXT,
  error_msg       TEXT,
  page_count      INTEGER,
  word_count      INTEGER,
  flashcard_count INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own documents"
  ON documents FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own documents"
  ON documents FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own documents"
  ON documents FOR UPDATE
  USING (auth.uid() = user_id);

CREATE INDEX idx_documents_user_created ON documents(user_id, created_at DESC);

-- Storage buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('pdfs', 'pdfs', false, 26214400, ARRAY['application/pdf']),
  ('outputs', 'outputs', false, 10485760, ARRAY['text/markdown', 'text/plain'])
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: pdfs
CREATE POLICY "Users can upload their own PDFs"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can read their own PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own PDFs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'pdfs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage RLS: outputs
CREATE POLICY "Users can read their own outputs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'outputs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Edge function can write outputs"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'outputs');

CREATE POLICY "Edge function can update outputs"
  ON storage.objects FOR UPDATE
  WITH CHECK (bucket_id = 'outputs');
