// subjects.js — Subject/course CRUD helpers
import { sb } from './supabase-client.js';

export async function getSubjects() {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return [];
  const { data, error } = await sb
    .from('subjects')
    .select('*')
    .order('name', { ascending: true });
  if (error) { console.error('getSubjects:', error); return []; }
  return data || [];
}

export async function createSubject(name, color = '#6366f1') {
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return { error: 'Not authenticated' };
  const { data, error } = await sb
    .from('subjects')
    .insert({ user_id: user.id, name: name.trim(), color })
    .select()
    .single();
  return { data, error };
}

export async function updateSubject(id, name, color) {
  const updates = {};
  if (name !== undefined) updates.name = name.trim();
  if (color !== undefined) updates.color = color;
  const { data, error } = await sb
    .from('subjects')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  return { data, error };
}

export async function deleteSubject(id) {
  const { error } = await sb
    .from('subjects')
    .delete()
    .eq('id', id);
  return { error };
}
