// auth.js — Auth helpers: signup, login, logout, session check (ES module)
// Import from supabase-client.js to get the shared client.

import { sb } from './supabase-client.js';

// ── Sign Up ──────────────────────────────────────────────
export async function signUp(email, password) {
  const { data, error } = await sb.auth.signUp({ email, password });
  if (error) throw error;
  return data;
}

// ── Log In ───────────────────────────────────────────────
export async function logIn(email, password) {
  const { data, error } = await sb.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ── Log Out ──────────────────────────────────────────────
export async function logOut() {
  await sb.auth.signOut();
  window.location.href = 'index.html';
}

// ── Get Session ──────────────────────────────────────────
export async function getSession() {
  const { data, error } = await sb.auth.getSession();
  return { session: data?.session ?? null, error: error ?? null };
}

// ── Get User ─────────────────────────────────────────────
export async function getUser() {
  const { data, error } = await sb.auth.getUser();
  return { user: data?.user ?? null, error: error ?? null };
}

// ── Require Auth (redirect to login only if genuinely unauthenticated)─
export async function requireAuth() {
  const { session, error } = await getSession();
  // Network error — don't redirect, let caller decide
  if (error) {
    return { session: null, error };
  }
  if (!session) {
    window.location.href = 'index.html';
    return { session: null, error: null };
  }
  return { session, error: null };
}

// ── Redirect if already logged in ────────────────────────
export async function redirectIfAuth() {
  const { session, error } = await getSession();
  // Network error — assume not authenticated to avoid false redirect
  if (error) return false;
  if (session) {
    window.location.href = 'upload.html';
    return true;
  }
  return false;
}
