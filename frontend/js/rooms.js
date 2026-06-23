// rooms.js — Study rooms CRUD helpers
import { sb } from './supabase-client.js';

export async function getRooms() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];

  // Get rooms where user is a member
  const { data, error } = await sb
    .from('room_members')
    .select('study_rooms(*), joined_at')
    .eq('user_id', user.id)
    .order('joined_at', { ascending: false });

  if (error) { console.error('getRooms:', error); return []; }
  return (data || []).map(r => r.study_rooms).filter(Boolean);
}

export async function createRoom(name) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Create room
  const { data: room, error: roomErr } = await sb
    .from('study_rooms')
    .insert({ name: name.trim(), created_by: user.id })
    .select()
    .single();

  if (roomErr) return { error: roomErr };

  // Add creator as member
  const { error: memberErr } = await sb
    .from('room_members')
    .insert({ room_id: room.id, user_id: user.id });

  if (memberErr) return { error: memberErr };

  return { data: room };
}

export async function joinRoom(inviteCode) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Find room by invite code (SECURITY DEFINER function bypasses RLS)
  const { data: rooms, error: findErr } = await sb
    .rpc('lookup_room_by_invite', { _code: inviteCode.trim() });

  if (findErr || !rooms || rooms.length === 0) return { error: 'Invalid invite code' };

  const room = rooms[0];

  // Check if already a member
  const { data: existing } = await sb
    .from('room_members')
    .select('*')
    .eq('room_id', room.id)
    .eq('user_id', user.id)
    .single();

  if (existing) return { data: room, alreadyMember: true };

  // Join
  const { error: joinErr } = await sb
    .from('room_members')
    .insert({ room_id: room.id, user_id: user.id });

  if (joinErr) return { error: joinErr };

  return { data: room };
}

export async function getRoomMembers(roomId) {
  const { data, error } = await sb
    .from('room_members')
    .select('user_id, joined_at, auth.users(email)')
    .eq('room_id', roomId);

  if (error) { console.error('getRoomMembers:', error); return []; }
  return data || [];
}

export async function getRoomDocuments(roomId) {
  const { data, error } = await sb
    .from('room_documents')
    .select('document_id, shared_by, shared_at, documents(*)')
    .eq('room_id', roomId)
    .order('shared_at', { ascending: false });

  if (error) { console.error('getRoomDocuments:', error); return []; }
  return (data || []).map(rd => ({
    ...rd.documents,
    shared_by: rd.shared_by,
    shared_at: rd.shared_at,
  }));
}

export async function shareDocument(roomId, documentId) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await sb
    .from('room_documents')
    .insert({
      room_id: roomId,
      document_id: documentId,
      shared_by: user.id,
    });

  return { error };
}

export async function removeDocument(roomId, documentId) {
  const { error } = await sb
    .from('room_documents')
    .delete()
    .eq('room_id', roomId)
    .eq('document_id', documentId);

  return { error };
}

export async function leaveRoom(roomId) {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { error } = await sb
    .from('room_members')
    .delete()
    .eq('room_id', roomId)
    .eq('user_id', user.id);

  return { error };
}

export async function deleteRoom(roomId) {
  const { error } = await sb
    .from('study_rooms')
    .delete()
    .eq('id', roomId);

  return { error };
}

export async function getRoomByInviteCode(code) {
  const { data: rooms, error } = await sb
    .rpc('lookup_room_by_invite', { _code: code.trim() });

  if (error || !rooms || rooms.length === 0) return { data: null, error: error || 'Not found' };
  return { data: rooms[0], error: null };
}
