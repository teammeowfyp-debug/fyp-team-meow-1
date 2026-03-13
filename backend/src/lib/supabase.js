import { createClient } from '@supabase/supabase-js'
import { env } from '../config/env.js'

export const supabase = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: { persistSession: false },
})

export function createSupabaseClient(token) {
    return createClient(env.supabaseUrl, env.supabaseAnonKey, {
        auth: { persistSession: false },
        global: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    })
}
