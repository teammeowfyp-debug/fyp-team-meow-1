import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'

const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
  auth: { persistSession: false },
})

export async function requireSupabaseAuth(req, res, next) {
  try {
    const header = req.header('Authorization') || ''
    const token = header.startsWith('Bearer ') ? header.slice('Bearer '.length) : ''
    if (!token) return res.status(401).json({ error: 'Missing Authorization Bearer token' })

    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return res.status(401).json({ error: 'Invalid or expired token' })

    req.user = data.user
    return next()
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' })
  }
}

