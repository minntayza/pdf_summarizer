-- ============================================================
-- 005: Add invite code lookup function (bypasses RLS)
-- ============================================================
-- Problem: study_rooms SELECT policy requires membership,
-- so non-members cannot look up a room by invite code to join it.
--
-- Fix: SECURITY DEFINER function that returns the room row
-- for a given invite code, running as the function owner (bypasses RLS).

CREATE OR REPLACE FUNCTION lookup_room_by_invite(_code TEXT)
RETURNS SETOF study_rooms
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT * FROM study_rooms
  WHERE invite_code = _code
  LIMIT 1;
$$;
