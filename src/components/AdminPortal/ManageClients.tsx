import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../lib/AuthProvider'
import { supabase } from '../../lib/supabaseClient'
import CustomSelect from '../UI/CustomSelect'
import './AdminPortal.css'

type UserOption = { user_id: string; full_name: string; email: string; role: string }
type ClientRow = { client_id: string; name_as_per_id: string; assigned_user_id: string; assigned_user?: UserOption }

const ManageClients: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [users, setUsers] = useState<UserOption[]>([])
  const [theirClients, setTheirClients] = useState<ClientRow[]>([])
  const [clientSearchLeft, setClientSearchLeft] = useState('')
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
  const [userSearchTerm, setUserSearchTerm] = useState('')
  const [userResults, setUserResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [showUserResults, setShowUserResults] = useState(false)
  const userSearchRef = React.useRef<HTMLDivElement>(null)

  const agents = useMemo(() => users.filter((u) => u.role === 'staff' || u.role === 'admin'), [users])

  // Debounced search for users
  useEffect(() => {
    if (userSearchTerm.trim().length > 0) {
      setIsSearching(true)
    } else {
      setIsSearching(false)
      setUserResults([])
      setShowUserResults(false)
    }

    const timer = setTimeout(async () => {
      if (userSearchTerm.trim().length > 0) {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('user_id, full_name, email, role')
            .or(`full_name.ilike.${userSearchTerm}%,email.ilike.${userSearchTerm}%`)
            .in('role', ['staff', 'admin'])
            .limit(5)

          if (!error && data) {
            setUserResults(data)
            setShowUserResults(true)
          }
        } catch (err) {
          console.error('User search error:', err)
        } finally {
          setIsSearching(false)
        }
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [userSearchTerm])

  // Handle click away for user search
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userSearchRef.current && !userSearchRef.current.contains(event.target as Node)) {
        setShowUserResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  // Search clients for "Add clients" (right side)
  useEffect(() => {
    if (!selectedUserId) {
      setAddClientsResults([])
      setAddSearchLoading(false)
      return
    }

    setAddSearchLoading(true)
    setError(null)

    const timer = setTimeout(async () => {
      try {
        let query = supabase
          .from('clients')
          .select('client_id, name_as_per_id, assigned_user_id')
          .neq('assigned_user_id', selectedUserId)
          .order('name_as_per_id')
          .limit(50)

        if (addClientsSearch.trim()) {
          query = query.ilike('name_as_per_id', `${addClientsSearch.trim()}%`)
        }

        const { data, error: err } = await query

        if (err) throw err

        // Map current owner
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
        console.error('Failed to search clients:', e)
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

      setSuccess(`Successfully reassigned ${ids.length} portfolios.`)
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

      setSuccess(`Assigned ${ids.length} active portfolios to the selected advisor.`)
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


  const filteredTheirClients = useMemo(() => {
    return theirClients.filter(c =>
      c.name_as_per_id.toLowerCase().startsWith(clientSearchLeft.toLowerCase())
    )
  }, [theirClients, clientSearchLeft])

  return (
    <div className="agent-focus-section" style={{ paddingTop: '0' }}>
      <div className="panel-header" style={{ marginBottom: '0.5rem', paddingTop: '0.5rem', paddingBottom: '0.75rem', position: 'sticky', top: '0', background: '#fff', zIndex: '10' }}>
        <h3 className="panel-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px', flexShrink: 0 }}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          Manage Clients
        </h3>
      </div>

      <div className="search-container" ref={userSearchRef} style={{ marginBottom: '1.5rem', width: '100%', maxWidth: 'none' }}>
        <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          type="text"
          className="search-input"
          placeholder="Search user by name or email"
          value={userSearchTerm}
          onChange={(e) => {
            setUserSearchTerm(e.target.value)
            setShowUserResults(true)
          }}
          onFocus={() => userSearchTerm.trim().length > 0 && setShowUserResults(true)}
        />
        {isSearching && (
          <div className="search-spinner-wrapper" style={{ marginLeft: '10px', display: 'flex', alignItems: 'center' }}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                animation: 'hourglassFlip 1.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite'
              }}
            >
              <path d="M5 2h14l-7 9.5-7-9.5z" fill="var(--bg-main)"></path>
              <path d="M5 22h14l-7-9.5-7 9.5z" fill="var(--bg-main)"></path>
            </svg>
          </div>
        )}

        {showUserResults && userResults.length > 0 && (
          <div className="search-results glass-card" style={{ top: 'calc(100% + 8px)' }}>
            {userResults.map((u) => (
              <div
                key={u.user_id}
                className="search-result-item"
                style={{ cursor: 'pointer' }}
                onClick={() => {
                  setSelectedUserId(u.user_id)
                  setUserSearchTerm('')
                  setShowUserResults(false)
                }}
              >
                <span className="result-name">{u.full_name}</span>
                <span style={{ fontSize: '11px', opacity: 0.6 }}>{u.email}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <div className="status-toast status-toast-error">{error}</div>}
      {success && <div className="status-toast status-toast-success">{success}</div>}

      {selectedUserId && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', alignItems: 'start' }}>
          {/* Current Portfolio */}
          {/* Reassign Client (Left) */}
          <section className="manage-users-panel">
            <div className="panel-header" style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: '700', color: 'var(--secondary)' }}>
                Reassign Client
              </div>
            </div>

            <div className="search-container" style={{ marginBottom: '1rem', width: '100%', maxWidth: 'none', background: 'rgba(0,0,0,0.02)' }}>
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search their clients..."
                value={clientSearchLeft}
                onChange={(e) => setClientSearchLeft(e.target.value)}
              />
            </div>

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
            ) : theirClients.length === 0 ? (
              <p className="manage-users-hint">This user currently has no assigned clients.</p>
            ) : (
              <>
                <div style={{ padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '2rem', marginBottom: '1rem' }}>
                  <CustomSelect
                    value={reassignToUserId}
                    onChange={(val) => setReassignToUserId(val)}
                    placeholder="Reassign to..."
                    options={agents
                      .filter((u) => u.user_id !== selectedUserId)
                      .map((u) => ({ label: u.full_name, value: u.user_id }))
                    }
                    wrapperStyle={{ minWidth: '200px', flex: '0 1 auto' }}
                    triggerStyle={{ padding: '0 14px', height: '2rem' }}
                  />
                  <button
                    className="btn-base btn-outline btn-small"
                    style={{
                      width: 'auto',
                      whiteSpace: 'nowrap',
                      padding: '0 1.5rem',
                      fontSize: '11px',
                      height: '2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: 0
                    }}
                    onClick={handleBulkReassign}
                    disabled={bulkLoading || !reassignToUserId || selectedForRemove.size === 0}
                  >
                    {bulkLoading ? '...' : (selectedForRemove.size > 0 ? `REASSIGN ${selectedForRemove.size} CLIENT${selectedForRemove.size > 1 ? 'S' : ''}` : 'REASSIGN')}
                  </button>
                </div>

                <div className="manage-users-table-container">
                  <table className="manage-users-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>
                          <input type="checkbox" className="custom-checkbox" checked={filteredTheirClients.length > 0 && filteredTheirClients.every(c => selectedForRemove.has(c.client_id))} onChange={selectAllRemove} />
                        </th>
                        <th>Client Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTheirClients.map((c) => (
                        <tr
                          key={c.client_id}
                          className={`clickable ${selectedForRemove.has(c.client_id) ? 'selected' : ''}`}
                          onClick={() => toggleRemove(c.client_id)}
                        >
                          <td onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" className="custom-checkbox" checked={selectedForRemove.has(c.client_id)} onChange={() => toggleRemove(c.client_id)} />
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

          {/* Expand Portfolio */}
          {/* Assign Client (Right) */}
          <section className="manage-users-panel">
            <div className="panel-header" style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: 'var(--text-sm)', fontWeight: '700', color: 'var(--secondary)' }}>
                Assign Client
              </div>
            </div>

            <div className="search-container" style={{ marginBottom: '1rem', width: '100%', maxWidth: 'none', background: 'rgba(0,0,0,0.02)' }}>
              <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
              <input
                type="text"
                className="search-input"
                placeholder="Search from directory..."
                value={addClientsSearch}
                onChange={(e) => setAddClientsSearch(e.target.value)}
              />
            </div>

            {addSearchLoading ? (
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
            ) : addClientsResults.length === 0 ? (
              <p className="manage-users-hint">No clients available to assign.</p>
            ) : (
              <>
                <div style={{ padding: '0', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', height: '2rem', marginBottom: '1rem' }}>
                  <button
                    className="btn-base btn-outline btn-small"
                    style={{
                      width: 'auto',
                      whiteSpace: 'nowrap',
                      padding: '0 1.5rem',
                      fontSize: '11px',
                      height: '2rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      margin: 0
                    }}
                    onClick={handleBulkAssign}
                    disabled={bulkLoading || selectedForAdd.size === 0}
                  >
                    {bulkLoading ? '...' : (selectedForAdd.size > 0 ? `ASSIGN ${selectedForAdd.size} CLIENT${selectedForAdd.size > 1 ? 'S' : ''}` : 'ASSIGN')}
                  </button>
                </div>

                <div className="manage-users-table-container">
                  <table className="manage-users-table">
                    <thead>
                      <tr>
                        <th style={{ width: 40 }}>
                          <input type="checkbox" className="custom-checkbox" checked={addClientsResults.length > 0 && selectedForAdd.size === addClientsResults.length} onChange={selectAllAdd} />
                        </th>
                        <th>Client Name</th>
                        <th>Assigned To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {addClientsResults.map((c) => (
                        <tr
                          key={c.client_id}
                          className={`clickable ${selectedForAdd.has(c.client_id) ? 'selected' : ''}`}
                          onClick={() => toggleAdd(c.client_id)}
                        >
                          <td onClick={(e) => e.stopPropagation()}>
                            <input type="checkbox" className="custom-checkbox" checked={selectedForAdd.has(c.client_id)} onChange={() => toggleAdd(c.client_id)} />
                          </td>
                          <td>{c.name_as_per_id}</td>
                          <td>
                            {c.assigned_user?.full_name || 'Unassigned'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        </div>
      )}
    </div>
  )
}

export default ManageClients


