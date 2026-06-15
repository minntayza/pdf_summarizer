// supabase-client.js — Supabase SDK initialization

const SUPABASE_URL = 'https://efkraurkqiavqdilkjpt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVma3JhdXJrcWlhdnFkaWxranB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzUzMjgsImV4cCI6MjA5NzAxMTMyOH0.ElPgpRN-ubpg93nMFSUmHUAukyw5bWL2GvtLv4Wddyg';

let _client = null;

function initSupabase() {
  if (_client) return _client;

  // The supabase-js v2 UMD CDN exposes the createClient function globally
  // Try multiple possible global names
  const sb =
    (typeof supabase !== 'undefined' && supabase && supabase.createClient) ? supabase :
    (typeof window !== 'undefined' && window.supabase) ? window.supabase :
    null;

  if (!sb || !sb.createClient) {
    throw new Error('Supabase SDK not loaded. Check your internet connection and refresh.');
  }

  _client = sb.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _client;
}

window.initSupabase = initSupabase;
