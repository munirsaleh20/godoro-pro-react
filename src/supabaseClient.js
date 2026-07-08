import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// NOTE: sbAdmin (service role key) itaongezwa hatua ijayo (kwa ajili ya
// kuunda staff accounts), TENA si kwenye client bundle - hilo linahitaji
// Edge Function au backend ndogo, kwa sababu service role key haipaswi
// kamwe kuonekana kwenye JS inayotumwa kwa browser (hatari ya usalama).
