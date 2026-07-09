/**
 * Supabase client initialized with the anon key (safe for client-side use).
 * Uses environment variables from Vite (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY).
 *
 * WARNING: Do NOT use the service-role key here — it must never be exposed
 * to the browser. The anon key is safe because RLS policies restrict access
 * to each user's own rows.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in setu-web/.env"
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
