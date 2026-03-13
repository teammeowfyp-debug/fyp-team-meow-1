import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthProvider'
import { supabase } from '../lib/supabaseClient'
import './Login.css'

const AddUser: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'staff' | 'admin'>('staff')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  if (user && !user.admin) {
    navigate('/')
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    const trimmedEmail = email.trim().toLowerCase()
    if (!trimmedEmail || !fullName.trim() || !password) {
      setError('Please fill in all fields')
      return
    }
    if (/\s/.test(trimmedEmail)) {
      setError('Email cannot contain spaces')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('create-user', {
        body: {
          email: trimmedEmail,
          full_name: fullName.trim(),
          password,
          role,
        },
      })

      if (invokeError) {
        setError(invokeError.message || 'Failed to create user')
        setLoading(false)
        return
      }
      if (data?.error) {
        setError(data.error)
        setLoading(false)
        return
      }

      setSuccess(true)
      setEmail('')
      setFullName('')
      setPassword('')
      setRole('staff')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card glass-card animate-fade" style={{ maxWidth: 480 }}>
        <header className="login-header">
          <h2>Add User</h2>
          <span className="login-subtitle">Create a new staff or admin account</span>
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

        {success && (
          <div className="add-user-success">
            <div className="add-user-success-icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div className="add-user-success-content">
              <strong>User created successfully</strong>
              <p>They can now sign in with the email and password you set.</p>
            </div>
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
              />
            </div>
          </label>

          <label className="login-label">
            Email address
            <div className="login-input-wrapper">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value.replace(/\s/g, ''))}
                placeholder="advisor@calibre.com"
                autoComplete="email"
              />
            </div>
          </label>

          <label className="login-label">
            Temporary password
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
          <span className="login-subtitle" style={{ fontSize: '0.8rem', marginTop: '-12px' }}>Must be at least 6 characters. User should change after first login.</span>

          <label className="login-label">
            Role
            <div className="login-input-wrapper">
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'staff' | 'admin')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '4px',
                  border: '1px solid var(--border)',
                  background: '#fff',
                  fontSize: '1rem',
                }}
              >
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </label>

          <button type="submit" className="login-submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create User'}
          </button>
        </form>

        <p className="login-footer-link">
          <button type="button" onClick={() => navigate('/admin/manage-users')} className="login-link" style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}>
            ← Back to Manage Users
          </button>
        </p>
      </div>
    </div>
  )
}

export default AddUser
