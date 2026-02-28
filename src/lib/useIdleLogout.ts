import { useEffect, useRef, useState, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'

export const IDLE_LOGOUT_ACK_KEY = 'idle_logout_ack'
export const LAST_ACTIVITY_KEY = 'last_activity_timestamp'

const EVENTS: Array<keyof WindowEventMap> = [
  'mousemove',
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
  'click',
]

export function useIdleLogout(
  supabase: SupabaseClient,
  {
    idleMs = 15 * 60 * 1000,
    redirectTo = '/login',
    warningBeforeMs = 60_000,
  }: { idleMs?: number; redirectTo?: string; warningBeforeMs?: number } = {}
) {
  const [warningVisible, setWarningVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const lastUpdateRef = useRef<number>(0)

  const performLogout = useCallback(async () => {
    await supabase.auth.signOut()
    sessionStorage.setItem(IDLE_LOGOUT_ACK_KEY, '1')
    window.location.assign(redirectTo)
  }, [supabase, redirectTo])

  const checkActivity = useCallback(() => {
    const lastActivity = parseInt(localStorage.getItem(LAST_ACTIVITY_KEY) || '0', 10)
    const now = Date.now()
    const diff = now - lastActivity

    if (diff >= idleMs) {
      performLogout()
    } else if (diff >= (idleMs - warningBeforeMs)) {
      setWarningVisible(true)
    } else {
      setWarningVisible(false)
    }
  }, [idleMs, warningBeforeMs, performLogout])

  const registerActivity = useCallback(() => {
    const now = Date.now()
    // Throttle updates to once every 2 seconds
    if (now - lastUpdateRef.current > 2000) {
      lastUpdateRef.current = now
      localStorage.setItem(LAST_ACTIVITY_KEY, now.toString())
      setWarningVisible(false)
    }
  }, [])

  const dismissWarning = useCallback(() => {
    setWarningVisible(false)
    registerActivity()
  }, [registerActivity])

  useEffect(() => {
    if (!supabase) return

    // Initialize/Reset activity on mount
    const now = Date.now()
    lastUpdateRef.current = now
    localStorage.setItem(LAST_ACTIVITY_KEY, now.toString())

    // Set up local check timer
    timerRef.current = setInterval(checkActivity, 5000)

    // Listen for activity
    EVENTS.forEach((e) => window.addEventListener(e, registerActivity, { passive: true }))

    // Listen for storage changes (activity in other tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === LAST_ACTIVITY_KEY) {
        checkActivity()
      }
    }
    window.addEventListener('storage', handleStorage)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      EVENTS.forEach((e) => window.removeEventListener(e, registerActivity))
      window.removeEventListener('storage', handleStorage)
    }
  }, [supabase, checkActivity, registerActivity])

  return { warningVisible, dismissWarning }
}
