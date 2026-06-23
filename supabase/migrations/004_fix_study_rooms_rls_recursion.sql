-- ============================================================
-- 004: Fix infinite RLS recursion between study_rooms and room_members
-- ============================================================
-- The mutual recursion:
--   study_rooms SELECT  → checks room_members
--   room_members SELECT → checks study_rooms
-- = infinite loop (error 42P17)
--
-- Fix: use SECURITY DEFINER functions that bypass RLS to break the cycle.

-- Step 1: Helper functions (run with owner privileges, not subject to RLS)
CREATE OR REPLACE FUNCTION is_room_member(_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM room_members
    WHERE room_members.room_id = _room_id
      AND room_members.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION is_room_creator(_room_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM study_rooms
    WHERE study_rooms.id = _room_id
      AND study_rooms.created_by = auth.uid()
  );
$$;

-- Step 2: Rewrite study_rooms SELECT policy to use is_room_member()
DROP POLICY IF EXISTS "Members can read study rooms" ON study_rooms;
CREATE POLICY "Members can read study rooms"
  ON study_rooms FOR SELECT
  USING (
    created_by = auth.uid()
    OR is_room_member(id)
  );

-- Step 3: Rewrite room_members SELECT policy to use is_room_creator()
DROP POLICY IF EXISTS "Members can read room members" ON room_members;
CREATE POLICY "Members can read room members"
  ON room_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR is_room_creator(room_id)
  );
