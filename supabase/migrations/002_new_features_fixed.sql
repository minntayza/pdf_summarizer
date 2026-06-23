-- Migration 002: New features (Subjects, SRS, Quiz, Chat, Study Rooms)
-- FIXED VERSION: safe to re-run even if partially applied
-- Run this in Supabase SQL Editor if the original migration errored with "already exists"

-- ============================================================
-- 1. SUBJECTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS subjects (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  color      TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own subjects" ON subjects;
CREATE POLICY "Users can read own subjects"
  ON subjects FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own subjects" ON subjects;
CREATE POLICY "Users can insert own subjects"
  ON subjects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own subjects" ON subjects;
CREATE POLICY "Users can update own subjects"
  ON subjects FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own subjects" ON subjects;
CREATE POLICY "Users can delete own subjects"
  ON subjects FOR DELETE
  USING (auth.uid() = user_id);

-- idx_subjects_user — only if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_subjects_user') THEN
    CREATE INDEX idx_subjects_user ON subjects(user_id, name);
  END IF;
END $$;

-- Add subject_id to documents (if not already added)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'subject_id'
  ) THEN
    ALTER TABLE documents ADD COLUMN subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_documents_subject') THEN
    CREATE INDEX idx_documents_subject ON documents(user_id, subject_id);
  END IF;
END $$;

-- ============================================================
-- 2. ADD LANGUAGE AND QUIZ_COUNT TO DOCUMENTS
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'language'
  ) THEN
    ALTER TABLE documents ADD COLUMN language TEXT NOT NULL DEFAULT 'english';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'documents' AND column_name = 'quiz_count'
  ) THEN
    ALTER TABLE documents ADD COLUMN quiz_count INTEGER DEFAULT 0;
  END IF;
END $$;

-- ============================================================
-- 3. FLASHCARD REVIEWS TABLE (SRS)
-- ============================================================
CREATE TABLE IF NOT EXISTS flashcard_reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id   UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  card_index    INTEGER NOT NULL,
  ease_factor   REAL NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  next_review   TIMESTAMPTZ NOT NULL DEFAULT now(),
  review_count  INTEGER NOT NULL DEFAULT 0,
  UNIQUE(user_id, document_id, card_index)
);

ALTER TABLE flashcard_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own flashcard reviews" ON flashcard_reviews;
CREATE POLICY "Users can read own flashcard reviews"
  ON flashcard_reviews FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own flashcard reviews" ON flashcard_reviews;
CREATE POLICY "Users can insert own flashcard reviews"
  ON flashcard_reviews FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own flashcard reviews" ON flashcard_reviews;
CREATE POLICY "Users can update own flashcard reviews"
  ON flashcard_reviews FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reviews_due') THEN
    CREATE INDEX idx_reviews_due ON flashcard_reviews(user_id, next_review);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_reviews_doc') THEN
    CREATE INDEX idx_reviews_doc ON flashcard_reviews(user_id, document_id);
  END IF;
END $$;

-- ============================================================
-- 4. CHAT MESSAGES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own chat messages" ON chat_messages;
CREATE POLICY "Users can read own chat messages"
  ON chat_messages FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own chat messages" ON chat_messages;
CREATE POLICY "Users can insert own chat messages"
  ON chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_chat_doc') THEN
    CREATE INDEX idx_chat_doc ON chat_messages(user_id, document_id, created_at);
  END IF;
END $$;

-- ============================================================
-- 5. STUDY ROOMS TABLES
-- ============================================================
CREATE TABLE IF NOT EXISTS study_rooms (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  invite_code TEXT NOT NULL UNIQUE DEFAULT substr(gen_random_uuid()::text, 1, 8),
  created_by  UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS room_members (
  room_id   UUID NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, user_id)
);

CREATE TABLE IF NOT EXISTS room_documents (
  room_id     UUID NOT NULL REFERENCES study_rooms(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  shared_by   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shared_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (room_id, document_id)
);

ALTER TABLE study_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_documents ENABLE ROW LEVEL SECURITY;

-- study_rooms policies
DROP POLICY IF EXISTS "Members can read study rooms" ON study_rooms;
CREATE POLICY "Members can read study rooms"
  ON study_rooms FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = study_rooms.id
        AND room_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create study rooms" ON study_rooms;
CREATE POLICY "Users can create study rooms"
  ON study_rooms FOR INSERT
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creator can update own study rooms" ON study_rooms;
CREATE POLICY "Creator can update own study rooms"
  ON study_rooms FOR UPDATE
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Creator can delete own study rooms" ON study_rooms;
CREATE POLICY "Creator can delete own study rooms"
  ON study_rooms FOR DELETE
  USING (auth.uid() = created_by);

-- room_members policies
-- NOTE: Avoids infinite recursion by checking study_rooms (not room_members) for creator check,
-- and allows users to always see their own membership record.
DROP POLICY IF EXISTS "Members can read room members" ON room_members;
CREATE POLICY "Members can read room members"
  ON room_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM study_rooms
      WHERE study_rooms.id = room_members.room_id
        AND study_rooms.created_by = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Room creator can add members" ON room_members;
CREATE POLICY "Room creator can add members"
  ON room_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM study_rooms
      WHERE study_rooms.id = room_members.room_id
        AND study_rooms.created_by = auth.uid()
    )
    OR auth.uid() = room_members.user_id
  );

DROP POLICY IF EXISTS "Room creator or self can remove members" ON room_members;
CREATE POLICY "Room creator or self can remove members"
  ON room_members FOR DELETE
  USING (
    auth.uid() = room_members.user_id
    OR EXISTS (
      SELECT 1 FROM study_rooms
      WHERE study_rooms.id = room_members.room_id
        AND study_rooms.created_by = auth.uid()
    )
  );

-- room_documents policies
DROP POLICY IF EXISTS "Members can read room documents" ON room_documents;
CREATE POLICY "Members can read room documents"
  ON room_documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = room_documents.room_id
        AND room_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Members can share documents to room" ON room_documents;
CREATE POLICY "Members can share documents to room"
  ON room_documents FOR INSERT
  WITH CHECK (
    auth.uid() = shared_by
    AND EXISTS (
      SELECT 1 FROM room_members
      WHERE room_members.room_id = room_documents.room_id
        AND room_members.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Sharer or room creator can remove shared docs" ON room_documents;
CREATE POLICY "Sharer or room creator can remove shared docs"
  ON room_documents FOR DELETE
  USING (
    auth.uid() = shared_by
    OR EXISTS (
      SELECT 1 FROM study_rooms
      WHERE study_rooms.id = room_documents.room_id
        AND study_rooms.created_by = auth.uid()
    )
  );

-- Storage policy: allow room members to read shared document outputs
DROP POLICY IF EXISTS "Room members can read shared document outputs" ON storage.objects;
CREATE POLICY "Room members can read shared document outputs"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'outputs'
    AND EXISTS (
      SELECT 1 FROM room_documents rd
      JOIN room_members rm ON rm.room_id = rd.room_id
      JOIN documents d ON d.id = rd.document_id
      WHERE rm.user_id = auth.uid()
        AND storage.objects.name LIKE d.user_id::text || '/' || d.id::text || '/%'
    )
  );

-- Done!
-- Verify: run this after to confirm all tables exist:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('subjects','flashcard_reviews','chat_messages','study_rooms','room_members','room_documents');
