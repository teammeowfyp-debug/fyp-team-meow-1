// Supabase Edge Function: Create a new user (admin only)
// Deploy with: supabase functions deploy create-user
// Requires: SUPABASE_SERVICE_ROLE_KEY (set via Supabase Dashboard)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    const userToken = authHeader?.replace('Bearer ', '')
    if (!userToken) {
      return new Response(JSON.stringify({ error: 'Missing user token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, supabaseAnonKey)
    const { data: { user: caller } } = await userClient.auth.getUser(userToken)
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey)
    const { data: profile } = await adminClient
      .from('users')
      .select('admin')
      .eq('email', caller.email)
      .maybeSingle()

    if (!profile?.admin) {
      return new Response(JSON.stringify({ error: 'Admin access required' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const rawEmail = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const full_name = body?.full_name?.trim()
    const password = body?.password
    const role = body?.role

    if (!rawEmail || !full_name || !password) {
      return new Response(JSON.stringify({ error: 'Missing email, full_name, or password' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    if (/\s/.test(rawEmail)) {
      return new Response(JSON.stringify({ error: 'Email cannot contain spaces' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: newUser, error } = await adminClient.auth.admin.createUser({
      email: rawEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: role || 'staff', admin: role === 'admin' },
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, user_id: newUser.user?.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
