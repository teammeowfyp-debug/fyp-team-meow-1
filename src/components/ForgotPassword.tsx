import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import './Login.css'

const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    setLoading(true)
    const redirectTo = `${window.location.origin}/reset-password`
    const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo })
    setLoading(false)

    if (err) {
      setError(err.message)
      return
    }

    setSuccess(true)
  }

  return (
    <div className="login-page">
      <div className="login-card glass-card animate-fade">
        <header className="login-header">
          <h2>Reset password</h2>
          <span className="login-subtitle">
            Enter your email and we’ll send you a link to set a new password.
          </span>
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
          <div className="login-success">
            <p>Check your email for a link to reset your password. If you don’t see it, check spam.</p>
            <Link to="/login" className="login-link">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form-group" noValidate>
            <label className="login-label">
              Email address
              <div className="login-input-wrapper">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="advisor@calibre.com"
                  autoComplete="email"
                />
              </div>
            </label>

            <button type="submit" className="login-submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
        )}

        {!success && (
          <p className="login-footer-link">
            <Link to="/login">Back to sign in</Link>
          </p>
        )}
      </div>
    </div>
  )
}

export default ForgotPassword
