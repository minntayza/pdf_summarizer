// supabase-client.js — Centralized Supabase client (ES module)
// Import this in all HTML pages instead of hardcoding URL/key inline.

import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://zuxtrvaoavvnzbtgmtkn.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1eHRydmFvYXZ2bnpidGdtdGtuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ5MDI0NDgsImV4cCI6MjEwMDQ3ODQ0OH0.qDYjw8UtNbmVcTzDWKF7CnQWZqBXQkC9ZL6duOXcCg4';

// Pre-configured Supabase client
export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
