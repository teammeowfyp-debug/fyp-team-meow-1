import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthProvider'
import { supabase } from '../../lib/supabaseClient'
import CustomSelect from '../UI/CustomSelect'
import './AdminPortal.css'

type UserRow = { user_id: string; full_name: string; email: string; role: string }

const RemoveUser: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserRow[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [reassignToUserId, setReassignToUserId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const otherUsers = users.filter((u) => !selected.has(u.user_id))

  if (user && !user.admin) {
    navigate('/')
    return null
  }

  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('user_id, full_name, email, role')
        .order('full_name')
      if (data) setUsers(data)
      setLoading(false)
    }
    fetchUsers()
  }, [])

  useEffect(() => {
    if (reassignToUserId && selected.has(reassignToUserId)) {
      setReassignToUserId('')
    }
  }, [selected, reassignToUserId])

  const toggle = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  const selectAll = () => {
    if (selected.size === users.length) setSelected(new Set())
    else setSelected(new Set(users.map((u) => u.user_id)))
  }

  const handleDelete = async () => {
    const ids = [...selected]
    if (ids.length === 0) return
    setDeleting(true)
    setError(null)
    setSuccess(null)
    try {
      const body: { user_ids: string[]; reassign_to_user_id?: string } = { user_ids: ids }
      if (reassignToUserId) body.reassign_to_user_id = reassignToUserId
      const { data, error: invokeError } = await supabase.functions.invoke('delete-user', {
        body,
      })
      if (invokeError) throw new Error(invokeError.message)
      if (data?.error) throw new Error(data.error)
      setSuccess(reassignToUserId ? `User removed. Clients reassigned successfully.` : `Successfully removed ${ids.length} user(s).`)
      setSelected(new Set())
      setReassignToUserId('')
      setUsers((prev) => prev.filter((u) => !ids.includes(u.user_id)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'System error during account removal')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="agent-focus-section" style={{ paddingTop: '0' }}>
      <div className="panel-header" style={{ marginBottom: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.75rem', position: 'sticky', top: '0', background: '#fff', zIndex: '10' }}>
        <h2 className="panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="18" y1="9" x2="23" y2="14"></line><line x1="23" y1="9" x2="18" y2="14"></line></svg>
          Remove User
        </h2>
      </div>

      {error && <div className="status-toast status-toast-error">{error}</div>}
      {success && <div className="status-toast status-toast-success">{success}</div>}

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '400px', gap: '1.5rem' }}>
          <svg
              width="64"
              height="64"
              viewBox="0 0 24 24"
              stroke="var(--primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                  filter: 'drop-shadow(0 0 10px var(--primary-glow))',
                  animation: 'hourglassFlip 1.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite'
              }}
          >
              <path d="M5 2h14l-7 9.5-7-9.5z" fill="var(--bg-main)"></path>
              <path d="M5 22h14l-7-9.5-7 9.5z" fill="var(--bg-main)"></path>
          </svg>
          <p className="loading-text">Retrieving data...</p>
        </div>
      ) : users.length === 0 ? (
        <p className="manage-users-hint">No other registered users found.</p>
      ) : (
        <div>
          <div className="bulk-actions-bar" style={{ 
            borderColor: 'var(--danger)', 
            borderStyle: 'dashed',
            background: 'rgba(155, 34, 38, 0.05)', 
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '1rem'
          }}>
            <div className="bulk-actions-left">
              <span className="manage-users-label" style={{ width: 'auto', marginBottom: 0, whiteSpace: 'nowrap' }}>
                Transfer to
              </span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ opacity: 0.4, flexShrink: 0 }}><path d="m9 18 6-6-6-6"/></svg>
              <CustomSelect
                value={reassignToUserId}
                onChange={(val) => setReassignToUserId(val)}
                placeholder="Do not reassign clients"
                options={otherUsers.map(u => ({ label: `${u.full_name}`, value: u.user_id }))}
                wrapperStyle={{ width: '240px' }}
                triggerStyle={{ padding: '6px 12px' }}
                preventParentInteraction={true}
              />
            </div>
            <button
              className="btn-base btn-outline"
              style={{ 
                color: 'var(--danger)',
                borderColor: 'var(--danger)', 
                width: '140px', 
                flexShrink: 0,
                padding: '0.6rem 1rem',
                fontSize: '11px',
                transition: 'none'
              }}
              onClick={handleDelete}
              disabled={deleting || selected.size === 0}
            >
              {deleting ? 'Removing...' : (selected.size > 0 ? `REMOVE ${selected.size} USER${selected.size > 1 ? 'S' : ''}` : 'REMOVE USER')}
            </button>
          </div>

          <div className="manage-users-table-container">
            <table className="manage-users-table">
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input type="checkbox" className="custom-checkbox" checked={selected.size === users.length} onChange={selectAll} />
                  </th>
                  <th>User Name</th>
                  <th>System Email</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr 
                    key={u.user_id} 
                    className={`clickable ${selected.has(u.user_id) ? 'selected' : ''}`}
                    onClick={() => toggle(u.user_id)}
                  >
                    <td onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="custom-checkbox" checked={selected.has(u.user_id)} onChange={() => toggle(u.user_id)} />
                    </td>
                    <td style={{ fontWeight: 600 }}>{u.full_name}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{u.email}</td>
                    <td>
                      <span className={`badge ${u.role === 'admin' ? 'badge-admin' : 'badge-staff'}`}>
                        {u.role}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="manage-users-hint" style={{ marginTop: 'auto', paddingTop: '1rem', position: 'sticky', bottom: '0', background: '#fff', zIndex: '5', borderTop: '1px solid var(--border)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '6px', verticalAlign: 'middle' }}><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            Removing an account is permanent. Ensure all client portfolios are transferred if necessary.
          </p>
        </div>
      )}
    </div>
  )
}

export default RemoveUser


