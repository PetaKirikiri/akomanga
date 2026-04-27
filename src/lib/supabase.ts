import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url?.trim() || !anon?.trim()) {
  console.warn(
    '[akomanga] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy from Pūrākau `.env` or fill `.env.example` (project vuxeemwxdldfjybzgtxc).'
  );
}

export const supabase = createClient(url || '', anon || '');
