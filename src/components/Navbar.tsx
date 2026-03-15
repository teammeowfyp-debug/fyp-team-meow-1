import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthProvider'
import { supabase } from '../lib/supabaseClient'
import logo from '../assets/calibre logo.png'
import './Navbar.css'
import { PdfImport } from './PdfImport'

interface SearchResult {
    client_id: string;
    full_name: string;
}

const Navbar: React.FC = () => {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()
    const [searchQuery, setSearchQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const searchRef = useRef<HTMLDivElement>(null)
    const [showPdfImport, setShowPdfImport] = useState(false)

    // Close results when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowResults(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Debounced search - staff see only their clients, admins see all
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length > 0 && user) {
                setIsSearching(true)
                try {
                    let query = supabase
                        .from('clients')
                        .select('client_id, name_as_per_id')
                        .ilike('name_as_per_id', `${searchQuery}%`)
                        .limit(5)

                    if (!user.admin && user.userId) {
                        query = query.eq('assigned_user_id', user.userId)
                    }

                    const { data, error } = await query

                    if (!error && data) {
                        const mappedData = data.map(item => ({
                            client_id: item.client_id,
                            full_name: item.name_as_per_id
                        }))
                        setResults(mappedData)
                        setShowResults(true)
                    }
                } catch (err) {
                    console.error('Search error:', err)
                } finally {
                    setIsSearching(false)
                }
            } else {
                setResults([])
                setShowResults(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [searchQuery, user])

    const handleResultClick = (clientId: string) => {
        navigate(`/${clientId}`)
        setSearchQuery('')
        setShowResults(false)
    }

    const displayName = user?.fullName || user?.email?.split('@')[0] || 'User'
    const displayRole = user?.role === 'admin' ? 'Admin' : (user?.role === 'staff' ? 'Staff' : user?.role || 'Advisor')
    const initials = displayName
        .split(/\s+/)
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?'

    return (
        <>
        <nav className="navbar glass">
            <div className="navbar-left">
                <div className="logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <img src={logo} alt="Company Logo" className="navbar-logo" />
                </div>
            </div>

            <div className="navbar-center">
                <div className="search-container" ref={searchRef}>
                    <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search clients (e.g. Jonathan...)"
                        className="search-input"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => searchQuery.trim().length > 0 && setShowResults(true)}
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

                    {showResults && results.length > 0 && (
                        <div className="search-results glass-card">
                            {results.map((result) => (
                                <div
                                    key={result.client_id}
                                    className="search-result-item"
                                    onClick={() => handleResultClick(result.client_id)}
                                >
                                    <span className="result-name">{result.full_name}</span>
                                    <span className="result-id">{result.client_id}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="navbar-right">
                <Link to="/scenario" className="navbar-add-user-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                        <polyline points="16 7 22 7 22 13"></polyline>
                    </svg>
                    Scenario
                </Link>
                <button className="navbar-add-user-btn" onClick={() => setShowPdfImport(true)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="12" y1="18" x2="12" y2="12"></line>
                        <line x1="9" y1="15" x2="15" y2="15"></line>
                    </svg>
                    Create New Client Profile
                </button>
                {user?.admin && (
                    <Link to="/admin/manage-users" className="navbar-add-user-btn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="8.5" cy="7" r="4"></circle>
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Manage Users
                    </Link>
                )}
                <div className="profile-wrapper">
                    <div className="profile-container glass">
                        <div className="advisor-profile">
                            <div className="advisor-info">
                                <span className="advisor-name">{displayName}</span>
                                <span className="advisor-role">{displayRole}</span>
                            </div>
                            <div className="advisor-avatar">{initials}</div>
                        </div>

                        <div className="profile-dropdown">
                            <div className="dropdown-divider"></div>
                            <div className="dropdown-header">
                                <span className="user-email">{user?.email}</span>
                                <span className="user-status">Logged in</span>
                            </div>
                            <button className="logout-button" onClick={() => signOut()}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                    <polyline points="16 17 21 12 16 7"></polyline>
                                    <line x1="21" y1="12" x2="9" y2="12"></line>
                                </svg>
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
        {showPdfImport && (
            <PdfImport
                onClose={() => setShowPdfImport(false)}
                onSuccess={(newClientId) => {
                    setShowPdfImport(false);
                    if (newClientId) navigate(`/${newClientId}`);
                }}
            />
        )}
        </>
    )
}

export default Navbar
