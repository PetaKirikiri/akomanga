import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const jwt = authHeader.slice(7);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userRes, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = userRes.user.id;

    const { data: au, error: auErr } = await admin
      .from('app_users')
      .select('id, role, client_id')
      .eq('auth_user_id', userId)
      .maybeSingle();

    if (auErr || !au || au.role !== 'hr_admin' || au.client_id == null) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const clientId = au.client_id as number;

    const body = (await req.json()) as { name?: string; email?: string };
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const emailRaw = typeof body.email === 'string' ? body.email.trim() : '';
    const emailNorm = emailRaw.toLowerCase();

    if (!emailNorm || !name) {
      return new Response(JSON.stringify({ error: 'Name and email are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existingAu } = await admin
      .from('app_users')
      .select('id, auth_user_id')
      .eq('email', emailNorm)
      .maybeSingle();

    if (existingAu?.auth_user_id) {
      return new Response(JSON.stringify({ error: 'This email already has an account' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingAu) {
      const { error: upErr } = await admin
        .from('app_users')
        .update({ display_name: name })
        .eq('id', existingAu.id)
        .is('auth_user_id', null);
      if (upErr) throw upErr;
    } else {
      const { error: insErr } = await admin.from('app_users').insert({
        email: emailNorm,
        display_name: name,
        role: 'user',
        auth_user_id: null,
      });
      if (insErr) throw insErr;
    }

    const { data: existingSt } = await admin
      .from('students')
      .select('id, app_user_id')
      .eq('client_id', clientId)
      .eq('email', emailNorm)
      .maybeSingle();

    if (existingSt?.app_user_id) {
      return new Response(JSON.stringify({ error: 'Learner already linked for this organisation' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (existingSt) {
      const { error: stUp } = await admin.from('students').update({ name }).eq('id', existingSt.id).is('app_user_id', null);
      if (stUp) throw stUp;
    } else {
      const { error: stIns } = await admin.from('students').insert({
        name,
        email: emailNorm,
        client_id: clientId,
        app_user_id: null,
      });
      if (stIns) throw stIns;
    }

    const redirectTo = Deno.env.get('INVITE_REDIRECT_TO') ?? undefined;

    const { error: inviteErr } = await admin.auth.admin.inviteUserByEmail(emailNorm, {
      data: { full_name: name, client_id: String(clientId) },
      redirectTo,
    });

    if (inviteErr) {
      return new Response(JSON.stringify({ error: inviteErr.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Server error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
