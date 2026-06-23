-- Migration 003: Add missing DELETE policies
-- Migration 001 had SELECT/INSERT/UPDATE for documents + outputs,
-- but was missing DELETE for both. RLS silently blocks operations
-- that have no matching policy.

-- Add DELETE policy for documents table
DROP POLICY IF EXISTS "Users can delete own documents" ON documents;
CREATE POLICY "Users can delete own documents"
  ON documents FOR DELETE
  USING (auth.uid() = user_id);

-- Add DELETE policy for outputs bucket
DROP POLICY IF EXISTS "Users can delete their own outputs" ON storage.objects;
CREATE POLICY "Users can delete their own outputs"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'outputs'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
