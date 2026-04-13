import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './Login.css'

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    let mounted = true

    const initRecoverySession = async () => {
      // Supabase recovery links can arrive as:
      // - PKCE code flow: ?code=...
      // - token hash flow: ?token_hash=...&type=recovery
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')
      const tokenHash = url.searchParams.get('token_hash')
      const type = url.searchParams.get('type')

      try {
        if (code) {
          // Establish session from PKCE code.
          await supabase.auth.exchangeCodeForSession(code)
        } else if (tokenHash && type === 'recovery') {
          // Establish session from recovery token hash.
          await supabase.auth.verifyOtp({ type: 'recovery', token_hash: tokenHash })
        }
      } catch (e) {
        if (!mounted) return
        setError(e instanceof Error ? e.message : 'This reset link is invalid or expired. Please request a new one.')
      }

      const { data: { session } } = await supabase.auth.getSession()
      if (!mounted) return
      setReady(true)
      if (!session) {
        setError((prev) => prev || 'This reset link is invalid or expired. Please request a new one.')
        return
      }
    }

    // Run once on mount (don’t redirect away; show an error instead).
    const timer = setTimeout(initRecoverySession, 0)
    const { data: sub } = supabase.auth.onAuthStateChange((_event) => {
      // Once auth state changes, we can consider the page "ready" even if the session is null
      // (we'll show an error + let the user navigate back).
      if (!mounted) return
      setReady(true)
    })

    return () => {
      mounted = false
      clearTimeout(timer)
      sub?.subscription?.unsubscribe()
    }
  }, [navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const { error: err } = await supabase.auth.updateUser({ password })
    setLoading(false)

    if (err) {
      setError(err.message)
      return
    }

    setSuccess(true)
    await supabase.auth.signOut()
    setTimeout(() => navigate('/login', { replace: true }), 2000)
  }

  if (!ready) {
    return (
      <div className="login-page">
        <div className="login-card glass-card animate-fade">
          <p className="login-subtitle">Loading…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card glass-card animate-fade">
        <header className="login-header">
          <h2>Set new password</h2>
          <span className="login-subtitle">Choose a new password for your account.</span>
        </header>

        {error && (
          <div className="login-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            {error}
          </div>
        )}

        {success ? (
          <p className="login-subtitle">Password updated. Redirecting to sign in…</p>
        ) : (
          <form onSubmit={handleSubmit} className="login-form-group" noValidate>
            <label className="login-label">
              New password
              <div className="login-input-wrapper">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
            </label>

            <label className="login-label">
              Confirm password
              <div className="login-input-wrapper">
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  minLength={6}
                />
              </div>
            </label>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ResetPassword
