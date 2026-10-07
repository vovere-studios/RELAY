import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
// Public browser credentials for RELAY's own Supabase project.
// Pin the target so Lovable-managed environment values cannot switch the backend.
// This publishable key is not a server secret; row-level policies enforce access.
const url = 'https://aadbcovypefhlpsmoinn.supabase.co';
const key = 'sb_publishable_5x2X9wk0oNdGsXao5D0QFg_f3Gqv-F0';
export const supabase = url && key ? createClient<Database>(url,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}}) : null;
export function requireSupabase() { if (!supabase) throw new Error('Supabase configuration is missing.'); return supabase; }
