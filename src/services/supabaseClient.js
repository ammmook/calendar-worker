/* ═══════════════════════════════════════════════════════════════════════════════
   TimeFlow — Supabase Client
   ═══════════════════════════════════════════════════════════════════════════════
   สร้าง Supabase client จาก env:
     VITE_SUPABASE_URL
     VITE_SUPABASE_ANON_KEY
   ═══════════════════════════════════════════════════════════════════════════════ */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('[TimeFlow API] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY is not set. Backend calls will fail.');
}

export const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '', {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
