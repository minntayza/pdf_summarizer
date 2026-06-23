-- ============================================================
-- 006: Fix document access for room members
-- ============================================================
-- Problem: documents table RLS only allows the owner to read,
-- so room members can't view shared documents.
-- Also: pdfs storage bucket only allows owner downloads.
-- outputs storage was already fixed in migration 002.
--
-- Fix: add RLS policies that let room members read documents
-- and PDFs shared in rooms they belong to.

-- 1. Documents table: allow room members to read shared docs
DROP POLICY IF EXISTS "Room members can read shared documents" ON documents;
CREATE POLICY "Room members can read shared documents"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_documents rd
      WHERE rd.document_id = documents.id
        AND is_room_member(rd.room_id)
    )
  );

-- 2. PDFs storage: allow room members to read shared PDFs
DROP POLICY IF EXISTS "Room members can read shared PDFs" ON storage.objects;
CREATE POLICY "Room members can read shared PDFs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'pdfs'
    AND EXISTS (
      SELECT 1 FROM room_documents rd
      JOIN room_members rm ON rm.room_id = rd.room_id
      JOIN documents d ON d.id = rd.document_id
      WHERE rm.user_id = auth.uid()
        AND storage.objects.name LIKE d.user_id::text || '/' || d.id::text || '/%'
    )
  );
