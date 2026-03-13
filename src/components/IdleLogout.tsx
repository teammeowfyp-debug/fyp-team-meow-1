import React from 'react'
import { useIdleLogout } from '../lib/useIdleLogout'
import { useAuth } from '../lib/AuthProvider'
import { supabase } from '../lib/supabaseClient'

const IdleLogout: React.FC = () => {
  const { user } = useAuth()
  const { warningVisible, dismissWarning } = useIdleLogout(supabase, {
    idleMs: 15 * 60 * 1000,
    redirectTo: '/login',
    warningBeforeMs: 60_000,
  })

  if (!user || !warningVisible) return null

  return (
    <div className="idle-warning-overlay" role="dialog" aria-modal="true" aria-labelledby="idle-warning-title">
      <div className="idle-warning-popup">
        <h2 id="idle-warning-title">Session expiring</h2>
        <p>You'll be signed out in 60 seconds due to inactivity.</p>
        <button type="button" onClick={dismissWarning} className="idle-warning-stay">
          Stay logged in
        </button>
      </div>
    </div>
  )
}

export default IdleLogout
