// supabase-client.js — Centralized Supabase client (ES module)
// Import this in all HTML pages instead of hardcoding URL/key inline.

import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://efkraurkqiavqdilkjpt.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVma3JhdXJrcWlhdnFkaWxranB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzUzMjgsImV4cCI6MjA5NzAxMTMyOH0.ElPgpRN-ubpg93nMFSUmHUAukyw5bWL2GvtLv4Wddyg';

let _client = null;

export function initSupabase() {
  if (_client) return _client;
  _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _client;
}

// For convenience: a pre-configured client (most pages only need one)
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
