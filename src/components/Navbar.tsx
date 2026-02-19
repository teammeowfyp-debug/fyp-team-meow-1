import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthProvider'
import { supabase } from '../lib/supabaseClient'
import logo from '../assets/calibre logo.png'
import './Navbar.css'

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

    // Debounced search
    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim().length > 0) {
                setIsSearching(true)
                try {
                    const { data, error } = await supabase
                        .from('clients')
                        .select('client_id, full_name')
                        .ilike('full_name', `${searchQuery}%`)
                        .limit(5)

                    if (!error && data) {
                        setResults(data)
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
    }, [searchQuery])

    const handleResultClick = (clientId: string) => {
        navigate(`/${clientId}`)
        setSearchQuery('')
        setShowResults(false)
    }

    return (
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
                    {isSearching && <div className="search-spinner"></div>}

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
                <div className="profile-wrapper">
                    <div className="profile-container glass">
                        <div className="advisor-profile">
                            <div className="advisor-info">
                                <span className="advisor-name">Marcus Tan</span>
                                <span className="advisor-role">Premier Advisor</span>
                            </div>
                            <div className="advisor-avatar">MT</div>
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
    )
}

export default Navbar
