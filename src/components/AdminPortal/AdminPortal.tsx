import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/AuthProvider'
import { Button } from '../UI/Button'
import AddUser from './AddUser'
import ManageClients from './ManageClients'
import RemoveUser from './RemoveUser'
import './AdminPortal.css'

interface AdminPortalProps {
  defaultTab?: 'add' | 'edit' | 'delete'
}

const AdminPortal: React.FC<AdminPortalProps> = ({ defaultTab = 'add' }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  
  const [activeTab, setActiveTab] = useState<'add' | 'edit' | 'delete'>(defaultTab)

  // Sync tab with URL if navigated directly
  useEffect(() => {
    if (location.pathname.includes('/add-user')) setActiveTab('add')
    else if (location.pathname.includes('/manage-clients')) setActiveTab('edit')
    else if (location.pathname.includes('/remove-user')) setActiveTab('delete')
    else if (defaultTab) setActiveTab(defaultTab)
  }, [location, defaultTab])

  if (user && !user.admin) {
    navigate('/')
    return null
  }

  const handleTabChange = (tab: 'add' | 'edit' | 'delete') => {
    setActiveTab(tab)
    // Update the URL for consistency
    navigate(`/admin/${tab === 'add' ? 'add-user' : tab === 'edit' ? 'manage-clients' : 'remove-user'}`, { replace: true })
  }

  return (
    <div className="scenario-page animate-fade-in">
      {/* ── Page Header ─────────────────────── */}
      <div className="scenario-hero glass-card no-hover">
        <div className="scenario-hero-icon" style={{ background: 'var(--primary-glow)', padding: '0.75rem', borderRadius: '50%', color: 'var(--primary)' }}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <circle cx="12" cy="11" r="3"></circle>
            <path d="M7 18.5c.5-1 2-2 5-2s4.5 1 5 2"></path>
          </svg>
        </div>
        <div>
          <h1 className="scenario-title">Administrative Portal</h1>
          <p className="scenario-subtitle">
            Manage your advisory team, reassign clients, and control system access.
          </p>
        </div>
      </div>

      <div className="scenario-body">
        <section className="glass-card scenario-form-card no-hover animate-fade-in stagger-1" style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
          
          {/* Tabs Switcher - Standardized Style */}
          <div className="tabs-switcher" style={{ marginBottom: '1.25rem' }}>
            <Button
              variant="tab"
              isActive={activeTab === 'add'}
              onClick={() => handleTabChange('add')}
            >
              Add User
            </Button>
            <Button
              variant="tab"
              isActive={activeTab === 'edit'}
              onClick={() => handleTabChange('edit')}
            >
              Manage Clients
            </Button>
            <Button
              variant="tab"
              isActive={activeTab === 'delete'}
              onClick={() => handleTabChange('delete')}
            >
              Remove User
            </Button>
          </div>

          <div className="manage-users-content">
            {activeTab === 'add' && <AddUser />}
            {activeTab === 'edit' && <ManageClients />}
            {activeTab === 'delete' && <RemoveUser />}
          </div>
        </section>
      </div>
    </div>
  )
}

export default AdminPortal


