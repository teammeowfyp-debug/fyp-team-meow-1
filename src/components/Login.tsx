import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthProvider'
import { IDLE_LOGOUT_ACK_KEY } from '../lib/useIdleLogout'
import logo from '../assets/calibre logo.png'
import './Login.css'

const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [signedOutModal, setSignedOutModal] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn } = useAuth()

  useEffect(() => {
    if (sessionStorage.getItem(IDLE_LOGOUT_ACK_KEY) === '1') {
      setSignedOutModal(true)
    }
  }, [])

  const dismissSignedOutModal = () => {
    sessionStorage.removeItem(IDLE_LOGOUT_ACK_KEY)
    setSignedOutModal(false)
  }

  const from = (location.state as any)?.from?.pathname || '/'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Please enter both email and password')
      return
    }

    setLoading(true)
    const res = await signIn(email, password)
    setLoading(false)

    if (!res.success) {
      setError(res.message || 'Sign-in failed')
      return
    }

    navigate(from, { replace: true })
  }

  return (
    <div className="login-page">
      {signedOutModal && (
        <div className="idle-warning-overlay" role="dialog" aria-modal="true" aria-labelledby="idle-signedout-title">
          <div className="idle-warning-popup">
            <h2 id="idle-signedout-title">You have been signed out</h2>
            <p>You were signed out due to inactivity. Please sign in again.</p>
            <button type="button" onClick={dismissSignedOutModal} className="idle-warning-stay">
              OK
            </button>
          </div>
        </div>
      )}
      <div className="login-card glass-card animate-fade-in">
        <header className="login-header" style={{ textAlign: 'center' }}>
          <img src={logo} alt="Calibre Advisory" style={{ height: '48px', width: 'auto', objectFit: 'contain', margin: '0 auto 0.5rem auto', display: 'block' }} />
          <span className="login-subtitle">Sign in to manage your clients</span>
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
            Email Address
            <div className="login-input-wrapper">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="advisor@calibre.com"
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
              />
            </div>
          </label>

          <p className="login-footer-link">
            <Link to="/forgot-password">Forgot password?</Link>
          </p>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
