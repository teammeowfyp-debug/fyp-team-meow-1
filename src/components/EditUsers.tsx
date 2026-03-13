import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthProvider'
import { supabase } from '../lib/supabaseClient'
import './Login.css'
import './EditUsers.css'

type UserOption = { user_id: string; full_name: string; email: string; role: string }
type ClientRow = { client_id: string; name_as_per_id: string; assigned_user_id: string; assigned_user?: UserOption }

const EditUsers: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [users, setUsers] = useState<UserOption[]>([])
  const [theirClients, setTheirClients] = useState<ClientRow[]>([])
  const [addClientsSearch, setAddClientsSearch] = useState('')
  const [addClientsResults, setAddClientsResults] = useState<ClientRow[]>([])
  const [selectedForRemove, setSelectedForRemove] = useState<Set<string>>(new Set())
  const [selectedForAdd, setSelectedForAdd] = useState<Set<string>>(new Set())
  const [reassignToUserId, setReassignToUserId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [addSearchLoading, setAddSearchLoading] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const agents = useMemo(() => users.filter((u) => u.role === 'staff' || u.role === 'admin'), [users])

  if (user && !user.admin) {
    navigate('/')
    return null
  }

  // Fetch all users
  useEffect(() => {
    const fetchUsers = async () => {
      const { data } = await supabase.from('users').select('user_id, full_name, email, role').order('full_name')
      if (data) setUsers(data)
    }
    fetchUsers()
  }, [])

  // Fetch "their clients" when agent selected
  useEffect(() => {
    if (!selectedUserId) {
      setTheirClients([])
      return
    }
    const fetchTheirClients = async () => {
      setLoading(true)
      try {
        const { data, error: err } = await supabase
          .from('clients')
          .select('client_id, name_as_per_id, assigned_user_id')
          .eq('assigned_user_id', selectedUserId)
          .order('name_as_per_id')

        if (err) throw err

        const userMap = new Map(users.map((u) => [u.user_id, u]))
        setTheirClients(
          (data || []).map((c) => ({
            ...c,
            assigned_user: userMap.get(c.assigned_user_id),
          }))
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load clients')
        setTheirClients([])
      } finally {
        setLoading(false)
      }
    }
    fetchTheirClients()
    setSelectedForRemove(new Set())
    setAddClientsSearch('')
    setAddClientsResults([])
    setSelectedForAdd(new Set())
  }, [selectedUserId, users])

  // Search clients for "Add clients" (excluding those already assigned to selected agent)
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!addClientsSearch.trim() || !selectedUserId) {
        setAddClientsResults([])
        return
      }
      setAddSearchLoading(true)
      setError(null)
      try {
        const { data, error: err } = await supabase
          .from('clients')
          .select('client_id, name_as_per_id, assigned_user_id')
          .ilike('name_as_per_id', `%${addClientsSearch.trim()}%`)
          .neq('assigned_user_id', selectedUserId)
          .limit(20)

        if (err) throw err

        const userIds = [...new Set((data || []).map((c) => c.assigned_user_id))]
        const { data: userData } = await supabase.from('users').select('user_id, full_name, email, role').in('user_id', userIds)
        const userMap = new Map((userData || []).map((u) => [u.user_id, u]))

        setAddClientsResults(
          (data || []).map((c) => ({
            ...c,
            assigned_user: userMap.get(c.assigned_user_id),
          }))
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Search failed')
        setAddClientsResults([])
      } finally {
        setAddSearchLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [addClientsSearch, selectedUserId])

  const toggleRemove = (clientId: string) => {
    setSelectedForRemove((prev) => {
      const next = new Set(prev)
      if (next.has(clientId)) next.delete(clientId)
      else next.add(clientId)
      return next
    })
  }

  const toggleAdd = (clientId: string) => {
    setSelectedForAdd((prev) => {
      const next = new Set(prev)
      if (next.has(clientId)) next.delete(clientId)
      else next.add(clientId)
      return next
    })
  }

  const selectAllRemove = () => {
    if (selectedForRemove.size === theirClients.length) {
      setSelectedForRemove(new Set())
    } else {
      setSelectedForRemove(new Set(theirClients.map((c) => c.client_id)))
    }
  }

  const selectAllAdd = () => {
    if (selectedForAdd.size === addClientsResults.length) {
      setSelectedForAdd(new Set())
    } else {
      setSelectedForAdd(new Set(addClientsResults.map((c) => c.client_id)))
    }
  }

  const handleBulkReassign = async () => {
    const ids = [...selectedForRemove]
    if (ids.length === 0 || !reassignToUserId || !selectedUserId) return
    setBulkLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const { error: err } = await supabase
        .from('clients')
        .update({ assigned_user_id: reassignToUserId })
        .in('client_id', ids)

      if (err) throw err

      setSuccess(`Reassigned ${ids.length} client(s) successfully`)
      setSelectedForRemove(new Set())
      setReassignToUserId('')
      setTheirClients((prev) => prev.filter((c) => !ids.includes(c.client_id)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reassign')
    } finally {
      setBulkLoading(false)
    }
  }

  const handleBulkAssign = async () => {
    const ids = [...selectedForAdd]
    if (ids.length === 0 || !selectedUserId) return
    setBulkLoading(true)
    setError(null)
    setSuccess(null)
    try {
      const { error: err } = await supabase
        .from('clients')
        .update({ assigned_user_id: selectedUserId })
        .in('client_id', ids)

      if (err) throw err

      setSuccess(`Assigned ${ids.length} client(s) to agent successfully`)
      const toAdd = addClientsResults.filter((c) => ids.includes(c.client_id))
      const selectedUser = users.find((u) => u.user_id === selectedUserId)
      setTheirClients((prev) => [
        ...prev,
        ...toAdd.map((c) => ({
          ...c,
          assigned_user_id: selectedUserId,
          assigned_user: selectedUser,
        })),
      ])
      setSelectedForAdd(new Set())
      setAddClientsResults((prev) => prev.filter((c) => !ids.includes(c.client_id)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to assign')
    } finally {
      setBulkLoading(false)
    }
  }

  const selectedAgent = users.find((u) => u.user_id === selectedUserId)

  return (
    <div className="login-page edit-users-page">
      <div className="edit-users-card glass-card animate-fade">
        <header className="login-header">
          <h2>Edit Users</h2>
          <span className="login-subtitle">Select an agent, then manage their clients in bulk</span>
        </header>

        <div className="edit-users-section">
          <label className="edit-users-label">Select agent</label>
          <select
            className="edit-users-select edit-users-agent-select"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">Choose an agent...</option>
            {agents.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.full_name} ({u.role})
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="login-error">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            </div>
            <div className="add-user-success-content">
              <strong>{success}</strong>
            </div>
          </div>
        )}

        {selectedUserId && (
          <>
            {/* Their clients */}
            <section className="edit-users-panel">
              <h3 className="edit-users-panel-title">Their clients</h3>
              {loading ? (
                <p className="edit-users-loading">Loading clients...</p>
              ) : theirClients.length === 0 ? (
                <p className="edit-users-empty">No clients assigned to this agent</p>
              ) : (
                <>
                  <div className="edit-users-bulk-bar">
                    <label className="edit-users-check-all">
                      <input type="checkbox" checked={selectedForRemove.size === theirClients.length && theirClients.length > 0} onChange={selectAllRemove} />
                      Select all
                    </label>
                    {selectedForRemove.size > 0 && (
                      <div className="edit-users-bulk-actions">
                        <span className="edit-users-bulk-label">Reassign selected to</span>
                        <select
                          className="edit-users-select"
                          value={reassignToUserId}
                          onChange={(e) => setReassignToUserId(e.target.value)}
                          disabled={bulkLoading}
                        >
                          <option value="">Choose agent...</option>
                          {agents
                            .filter((u) => u.user_id !== selectedUserId)
                            .map((u) => (
                              <option key={u.user_id} value={u.user_id}>
                                {u.full_name}
                              </option>
                            ))}
                        </select>
                        <button
                          type="button"
                          className="edit-users-save-btn"
                          onClick={handleBulkReassign}
                          disabled={bulkLoading || !reassignToUserId}
                        >
                          {bulkLoading ? 'Reassigning...' : 'Reassign'}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="edit-users-table-wrap">
                    <table className="edit-users-table">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}></th>
                          <th>Client</th>
                        </tr>
                      </thead>
                      <tbody>
                        {theirClients.map((c) => (
                          <tr key={c.client_id} onClick={() => toggleRemove(c.client_id)} className="edit-users-clickable-row">
                            <td onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={selectedForRemove.has(c.client_id)} onChange={() => toggleRemove(c.client_id)} />
                            </td>
                            <td>{c.name_as_per_id}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>

            {/* Add clients */}
            <section className="edit-users-panel">
              <h3 className="edit-users-panel-title">Add clients to {selectedAgent?.full_name || 'agent'}</h3>
              <div className="edit-users-search">
                <input
                  type="text"
                  placeholder="Search clients by name..."
                  value={addClientsSearch}
                  onChange={(e) => setAddClientsSearch(e.target.value)}
                  className="edit-users-input"
                />
              </div>
              {addSearchLoading && <p className="edit-users-loading">Searching...</p>}
              {!addSearchLoading && addClientsSearch.trim() && addClientsResults.length === 0 && (
                <p className="edit-users-empty">No clients found (or all matching clients are already assigned to this agent)</p>
              )}
              {addClientsResults.length > 0 && (
                <>
                  <div className="edit-users-bulk-bar">
                    <label className="edit-users-check-all">
                      <input type="checkbox" checked={selectedForAdd.size === addClientsResults.length} onChange={selectAllAdd} />
                      Select all
                    </label>
                    {selectedForAdd.size > 0 && (
                      <div className="edit-users-bulk-actions">
                        <button
                          type="button"
                          className="edit-users-save-btn"
                          onClick={handleBulkAssign}
                          disabled={bulkLoading}
                        >
                          {bulkLoading ? 'Assigning...' : `Assign ${selectedForAdd.size} to ${selectedAgent?.full_name || 'agent'}`}
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="edit-users-table-wrap">
                    <table className="edit-users-table">
                      <thead>
                        <tr>
                          <th style={{ width: 40 }}></th>
                          <th>Client</th>
                          <th>Current agent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {addClientsResults.map((c) => (
                          <tr key={c.client_id} onClick={() => toggleAdd(c.client_id)} className="edit-users-clickable-row">
                            <td onClick={(e) => e.stopPropagation()}>
                              <input type="checkbox" checked={selectedForAdd.has(c.client_id)} onChange={() => toggleAdd(c.client_id)} />
                            </td>
                            <td>{c.name_as_per_id}</td>
                            <td>{c.assigned_user?.full_name || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </section>
          </>
        )}

        <p className="login-footer-link">
          <button type="button" onClick={() => navigate('/admin/manage-users')} className="login-link" style={{ background: 'none', border: 'none', cursor: 'pointer', font: 'inherit' }}>
            ← Back to Manage Users
          </button>
        </p>
      </div>
    </div>
  )
}

export default EditUsers
