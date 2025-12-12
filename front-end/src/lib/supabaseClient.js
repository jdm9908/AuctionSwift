// Supabase client setup - handles authentication and database connection
import { createClient } from '@supabase/supabase-js';

// Get Supabase credentials from environment variables
// These are public anon keys (safe for frontend), NOT service role keys
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLIC;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables. Check VITE_SUPABASE_URL and VITE_SUPABASE_PUBLIC');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'set' : 'MISSING');
  console.error('VITE_SUPABASE_PUBLIC:', supabaseAnonKey ? 'set' : 'MISSING');
}

// Create and export the Supabase client (will be null if env vars missing)
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
