import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthProvider'
import './Login.css'

const ManageUsers: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()

  if (user && !user.admin) {
    navigate('/')
    return null
  }

  return (
    <div className="login-page">
      <div className="login-card glass-card animate-fade" style={{ maxWidth: 420 }}>
        <header className="login-header">
          <h2>Manage Users</h2>
          <span className="login-subtitle">Add new staff or reassign clients to agents</span>
        </header>

        <div className="manage-users-buttons">
          <button
            type="button"
            className="manage-users-btn"
            onClick={() => navigate('/admin/add-user')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="8.5" cy="7" r="4"></circle>
              <line x1="20" y1="8" x2="20" y2="14"></line>
              <line x1="23" y1="11" x2="17" y2="11"></line>
            </svg>
            Add Users
          </button>
          <button
            type="button"
            className="manage-users-btn"
            onClick={() => navigate('/admin/edit-users')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
            Edit Users
          </button>
          <button
            type="button"
            className="manage-users-btn"
            onClick={() => navigate('/admin/delete-users')}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              <line x1="10" y1="11" x2="10" y2="17"></line>
              <line x1="14" y1="11" x2="14" y2="17"></line>
            </svg>
            Delete Users
          </button>
        </div>

        <p className="login-footer-link">
          <button type="button" onClick={() => navigate('/')} className="login-link" style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}>
            ← Back to dashboard
          </button>
        </p>
      </div>
    </div>
  )
}

export default ManageUsers
