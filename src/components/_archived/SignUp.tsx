/**
 * ARCHIVED: Public sign-up form.
 * Saved for later - will be replaced by internal admin-add-user flow.
 */
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../lib/AuthProvider'
import '../Login.css'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_FULL_NAME_LENGTH = 6
const MIN_PASSWORD_LENGTH = 6

const SignUp: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [confirmationSent, setConfirmationSent] = useState(false)
  const navigate = useNavigate()
  const { signUp } = useAuth()

  const trimmedFullName = fullName.trim()
  const isFullNameValid = trimmedFullName.length >= MIN_FULL_NAME_LENGTH
  const isEmailValid = EMAIL_REGEX.test(email.trim())
  const isPasswordValid = password.length >= MIN_PASSWORD_LENGTH
  const isFormValid = trimmedFullName.length > 0 && isFullNameValid && email.trim().length > 0 && isEmailValid && password.length > 0 && isPasswordValid

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setConfirmationSent(false)

    if (!trimmedFullName) {
      setError('Full name is required')
      return
    }
    if (trimmedFullName.length < MIN_FULL_NAME_LENGTH) {
      setError('Full name must be at least 6 characters')
      return
    }
    if (!email.trim()) {
      setError('Email is required')
      return
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setError('Please enter a valid email address')
      return
    }
    if (!password) {
      setError('Password is required')
      return
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    const res = await signUp(email.trim(), password, { fullName: trimmedFullName })
    setLoading(false)

    if (!res.success) {
      setError(res.message || 'Sign up failed')
      return
    }

    if (res.requiresConfirmation) {
      setConfirmationSent(true)
      return
    }

    navigate('/', { replace: true })
  }

  if (confirmationSent) {
    return (
      <div className="login-page">
        <div className="login-card glass-card animate-fade">
          <header className="login-header">
            <h2>Check your email</h2>
            <span className="login-subtitle">
              We sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account.
            </span>
          </header>
          <div className="login-success">
            <p>If you don&apos;t see it, check your spam folder.</p>
            <Link to="/login" className="login-link">Back to sign in</Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-page">
      <div className="login-card glass-card animate-fade">
        <header className="login-header">
          <h2>Create account</h2>
          <span className="login-subtitle">Sign up to access the advisor portal</span>
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

        <form onSubmit={handleSubmit} className="login-form-group" noValidate>
          <label className="login-label">
            Full name
            <div className="login-input-wrapper">
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Marcus Tan"
                autoComplete="name"
                minLength={MIN_FULL_NAME_LENGTH}
              />
            </div>
          </label>
          <span className="login-subtitle" style={{ fontSize: '0.8rem', marginTop: '-12px' }}>Must be at least 6 characters</span>

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

          <label className="login-label">
            Password
            <div className="login-input-wrapper">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                minLength={MIN_PASSWORD_LENGTH}
              />
            </div>
          </label>
          <span className="login-subtitle" style={{ fontSize: '0.8rem', marginTop: '-12px' }}>Must be at least 6 characters</span>

          <button type="submit" className="login-submit" disabled={loading || !isFormValid}>
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="login-footer-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  )
}

export default SignUp
