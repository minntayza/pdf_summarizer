// supabase-client.js — Centralized Supabase client (ES module)
// Import this in all HTML pages instead of hardcoding URL/key inline.

import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://efkraurkqiavqdilkjpt.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVma3JhdXJrcWlhdnFkaWxranB0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0MzUzMjgsImV4cCI6MjA5NzAxMTMyOH0.ElPgpRN-ubpg93nMFSUmHUAukyw5bWL2GvtLv4Wddyg';

// Pre-configured Supabase client
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
