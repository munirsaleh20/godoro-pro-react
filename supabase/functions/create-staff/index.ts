// Supabase Edge Function: manage-staff
//
// Hii inashughulikia kuunda (create) na kufuta (delete) staff accounts
// kwa kutumia Service Role Key - lakini KEY HII INABAKI SERVER-SIDE PEKEE
// (kwenye Supabase, si kwenye browser). Hii ndiyo njia salama, tofauti na
// faili la HTML la awali lililokuwa na service key wazi kwenye JavaScript
// ya browser (hatari kubwa ya usalama).
//
// JINSI YA KU-DEPLOY:
//   1. Sakinisha Supabase CLI: npm install -g supabase
//   2. supabase login
//   3. supabase link --project-ref tghrcerahzztaitmmbfz
//   4. supabase functions deploy manage-staff
//
// Service Role Key tayari inapatikana kiotomatiki kwenye Edge Functions
// environment (SUPABASE_SERVICE_ROLE_KEY) - hauitaji kuiweka mwenyewe.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const callerClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    // 1) Thibitisha ni nani anayeita (caller)
    const { data: { user: caller }, error: authError } = await callerClient.auth.getUser();
    if (authError || !caller) {
      return json({ error: 'Not authenticated' }, 401);
    }

    // 2) Thibitisha caller ni owner au manager
    const { data: callerStaff, error: staffErr } = await callerClient
      .from('staff').select('role').eq('id', caller.id).single();
    if (staffErr || !callerStaff || !['owner', 'manager'].includes(callerStaff.role)) {
      return json({ error: 'Only Owner/Manager can manage staff' }, 403);
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const body = await req.json();

    if (body.action === 'create') {
      const { name, email, password, role, locationId } = body;
      if (!name || !email || !password || !role) {
        return json({ error: 'Missing required fields' }, 400);
      }
      if (role === 'salesperson' && !locationId) {
        return json({ error: 'Location is required for salesperson' }, 400);
      }
      // Manager pekee anaruhusiwa kuunda salesperson (si manager mwingine/owner)
      if (callerStaff.role === 'manager' && role !== 'salesperson') {
        return json({ error: 'Managers can only create Salesperson accounts' }, 403);
      }

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
      });
      if (createErr || !created?.user) {
        return json({ error: createErr?.message || 'Failed to create auth user' }, 400);
      }

      const initials = name.trim().split(/\s+/).map(w => w[0]?.toUpperCase() || '').slice(0, 2).join('');
      const { data: staffRow, error: insertErr } = await admin.from('staff').insert({
        id: created.user.id,
        name, email,
        avatar: initials,
        role,
        location_id: role === 'salesperson' ? locationId : null,
      }).select().single();

      if (insertErr) {
        await admin.auth.admin.deleteUser(created.user.id); // rollback
        return json({ error: insertErr.message }, 400);
      }

      return json({ success: true, staff: staffRow });
    }

    if (body.action === 'delete') {
      const { staffId } = body;
      if (!staffId) return json({ error: 'Missing staffId' }, 400);
      if (staffId === caller.id) return json({ error: 'You cannot delete your own account' }, 400);

      await admin.from('staff').delete().eq('id', staffId);
      const { error: delErr } = await admin.auth.admin.deleteUser(staffId);
      if (delErr) return json({ error: delErr.message }, 400);

      return json({ success: true });
    }

    // Owner pekee anaweza kubadilisha password ya Manager au Salesperson.
    // KUMBUKA: haiwezekani "kuona" password iliyopo ya sasa - Supabase
    // (kama mfumo wowote salama) hai-hifadhi password kwa namna
    // inayosomeka, ni hashed tu. Kinachowezekana ni ku-SET password mpya.
    if (body.action === 'reset-password') {
      const { staffId, newPassword } = body;
      if (!staffId || !newPassword) return json({ error: 'Missing staffId or newPassword' }, 400);
      if (newPassword.length < 6) return json({ error: 'Password must be at least 6 characters' }, 400);
      if (!['owner', 'manager'].includes(callerStaff.role)) {
        return json({ error: 'Only Owner/Manager can change another staff member\'s password' }, 403);
      }

      const { data: targetStaff, error: targetErr } = await admin
        .from('staff').select('role').eq('id', staffId).single();
      if (targetErr || !targetStaff) return json({ error: 'Staff member not found' }, 404);
      if (targetStaff.role === 'owner' && staffId !== caller.id) {
        return json({ error: 'Cannot change another Owner\'s password' }, 403);
      }

      const { error: updErr } = await admin.auth.admin.updateUserById(staffId, { password: newPassword });
      if (updErr) return json({ error: updErr.message }, 400);

      return json({ success: true });
    }

    return json({ error: 'Unknown action' }, 400);
  } catch (err) {
    return json({ error: err.message || 'Internal error' }, 500);
  }
});

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
