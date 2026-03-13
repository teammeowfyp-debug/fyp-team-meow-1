// Supabase Edge Function: Delete user(s) (admin only)
// Deletes auth user FIRST, then public.users row — so any trigger on public.users
// that tries to delete auth won't cause "Database error deleting user".
// Deploy: supabase functions deploy delete-user
// Requires: SUPABASE_SERVICE_ROLE_KEY

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const body = await req.json().catch(() => ({}))
    const userIds = Array.isArray(body?.user_ids) ? body.user_ids : [body?.user_id].filter(Boolean)
    const reassignToUserId = typeof body?.reassign_to_user_id === 'string' ? body.reassign_to_user_id.trim() || null : null

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing user_ids (array) or user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (reassignToUserId && userIds.includes(reassignToUserId)) {
      return new Response(JSON.stringify({ error: 'Reassign target cannot be one of the users you are deleting.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1) If reassign_to_user_id: move all clients from deleted users to that user. Else: require no clients.
    const { count: assignedCount } = await adminClient
      .from('clients')
      .select('*', { count: 'exact', head: true })
      .in('assigned_user_id', userIds)

    if ((assignedCount ?? 0) > 0) {
      if (reassignToUserId) {
        const { error: reassignErr } = await adminClient
          .from('clients')
          .update({ assigned_user_id: reassignToUserId })
          .in('assigned_user_id', userIds)
        if (reassignErr) {
          return new Response(
            JSON.stringify({ error: 'Failed to reassign clients: ' + reassignErr.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      } else {
        return new Response(
          JSON.stringify({ error: 'Reassign or remove all clients from these users before deleting, or choose "Reassign their clients to" below.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // public.users.user_id is gen_random_uuid(), not auth.users.id — we must look up auth user by email
    const { data: rows } = await adminClient
      .from('users')
      .select('user_id, email')
      .in('user_id', userIds)

    if (!rows?.length) {
      return new Response(JSON.stringify({ error: 'No matching users found in public.users' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: authList } = await adminClient.auth.admin.listUsers({ perPage: 1000 })
    const emailToAuthId = new Map<string, string>()
    for (const u of authList?.users ?? []) {
      if (u.email) emailToAuthId.set(u.email.trim().toLowerCase(), u.id)
    }

    const errors: string[] = []

    for (const row of rows) {
      const authId = row.email ? emailToAuthId.get(row.email.trim().toLowerCase()) : null

      // 2) Delete auth user FIRST (by auth id, not public.users.user_id)
      if (authId) {
        const { error: authErr } = await adminClient.auth.admin.deleteUser(authId)
        if (authErr) {
          const msg = authErr.message || ''
          if (!msg.includes('User not found') && !msg.includes('not found') && !msg.includes('404')) {
            errors.push(`${row.email}: ${msg}`)
            continue
          }
        }
      }

      // 3) Then delete from public.users
      const { error: dbErr } = await adminClient.from('users').delete().eq('user_id', row.user_id)
      if (dbErr) {
        errors.push(`${row.email ?? row.user_id}: ${dbErr.message}`)
      }
    }

    if (errors.length > 0) {
      return new Response(
        JSON.stringify({ error: 'Database error deleting user', details: errors }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ success: true, deleted: userIds.length }), {
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
