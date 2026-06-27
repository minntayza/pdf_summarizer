-- ============================================================
-- 007: Ensure is_room_member() is callable by authenticated users
-- ============================================================
-- Problem: The SECURITY DEFINER function is_room_member() may lack
-- EXECUTE permission for the authenticated role, causing RLS policy
-- evaluation to fail silently (returns 403/406 on document queries).
--
-- Fix: Explicitly grant EXECUTE and re-create the function to ensure
-- it's accessible.

-- Re-create the function (idempotent)
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

-- Grant execute to both Supabase roles
GRANT EXECUTE ON FUNCTION is_room_member(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_room_member(UUID) TO anon;

-- Also ensure is_room_creator() has proper permissions
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

GRANT EXECUTE ON FUNCTION is_room_creator(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION is_room_creator(UUID) TO anon;
