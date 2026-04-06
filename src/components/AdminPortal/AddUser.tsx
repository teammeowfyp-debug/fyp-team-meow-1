import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthProvider'
import { supabase } from '../../lib/supabaseClient'
import CustomSelect from '../UI/CustomSelect'
import './AdminPortal.css'

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
    <div className="manage-users-form-container" style={{ paddingTop: '0' }}>
      <div className="panel-header" style={{ marginBottom: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.75rem', position: 'sticky', top: '0', background: '#fff', zIndex: '10', width: '100%' }}>
        <h2 className="panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="8.5" cy="7" r="4"></circle>
            <line x1="20" y1="8" x2="20" y2="14"></line>
            <line x1="17" y1="11" x2="23" y2="11"></line>
          </svg>
          Add User
        </h2>
      </div>

      {error && (
        <div className="standard-error-box" style={{ marginBottom: '1rem' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className="status-toast status-toast-success">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <div>
            <strong>User Registered</strong>
            <p style={{ margin: 0, fontSize: 'var(--text-xs)', opacity: 0.9 }}>Access has been granted to the system.</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className="manage-users-input-group" style={{ marginBottom: '1rem' }}>
          <label className="manage-users-label">Full Name</label>
          <div className="manage-users-input-wrapper">
            <input
              type="text"
              className="manage-users-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Marcus Tan"
            />
          </div>
        </div>

        <div className="manage-users-input-group" style={{ marginBottom: '1rem' }}>
          <label className="manage-users-label">Email Address</label>
          <div className="manage-users-input-wrapper">
            <input
              type="email"
              className="manage-users-input"
              value={email}
              onChange={(e) => setEmail(e.target.value.replace(/\s/g, ''))}
              placeholder="user@calibre.com"
            />
          </div>
        </div>

        <div className="manage-users-input-group" style={{ marginBottom: '1rem' }}>
          <label className="manage-users-label">Temporary Password</label>
          <div className="manage-users-input-wrapper">
            <input
              type="password"
              className="manage-users-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <span className="manage-users-hint">Minimum 6 characters. User will be prompted to change this upon first login.</span>
        </div>

        <div className="manage-users-input-group" style={{ marginBottom: '1.25rem' }}>
          <label className="manage-users-label">System Role</label>
          <CustomSelect
            value={role}
            onChange={(val) => setRole(val as 'staff' | 'admin')}
            options={[
              { label: 'Staff - Standard access', value: 'staff' },
              { label: 'Admin - Full system control', value: 'admin' }
            ]}
          />
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.5rem', marginTop: '1.5rem' }}>
          <button type="submit" className="btn-base btn-primary w-full btn-large" disabled={loading}>
            {loading ? 'Processing...' : 'Create User'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default AddUser


