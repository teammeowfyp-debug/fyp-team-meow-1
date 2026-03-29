import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/AuthProvider'
import { supabase } from '../lib/supabaseClient'
import logo from '../assets/calibre logo.png'
import './Navbar.css'
import { Button } from './UI/Button';

interface SearchResult {
    client_id: string;
    full_name: string;
}

const Navbar: React.FC = () => {
    const { user, signOut } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [searchQuery, setSearchQuery] = useState('')
    const [results, setResults] = useState<SearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [showResults, setShowResults] = useState(false)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
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
        setIsMobileMenuOpen(false)
    }

    const displayName = user?.fullName || user?.email?.split('@')[0] || 'User'
    const displayRole = user?.role === 'admin' ? 'Admin' : (user?.role === 'staff' ? 'Staff' : user?.role || 'Advisor')
    const initials = displayName
        .split(/\s+/)
        .map((p) => p[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || '?'

    // Store last viewed client for the Dashboard button
    useEffect(() => {
        const path = location.pathname;
        const potentialId = path.split('/')[1];
        const systemPages = ['scenario', 'add-client', 'admin', 'login', 'forgot-password', 'reset-password'];
        if (potentialId && !systemPages.includes(potentialId)) {
            localStorage.setItem('last-viewed-client', potentialId);
        }
    }, [location.pathname]);

    const lastId = localStorage.getItem('last-viewed-client');
    const dashboardLink = lastId ? `/${lastId}` : '/';
    const isDashboardActive = location.pathname === '/' || (!['/scenario', '/add-client', '/admin'].some(p => location.pathname.startsWith(p)));

    const menuContent = (isMobile: boolean) => (
        <>
            <div className={`navbar-actions ${isMobile ? 'mobile' : ''}`}>
                <Link 
                    to={dashboardLink} 
                    className={`action-btn ${isDashboardActive ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                    Dashboard
                </Link>

                <Link 
                    to="/scenario" 
                    className={`action-btn ${location.pathname.startsWith('/scenario') ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
                        <polyline points="16 7 22 7 22 13"></polyline>
                    </svg>
                    Scenario
                </Link>
                
                <Link 
                    to="/add-client"
                    className={`action-btn ${location.pathname === '/add-client' ? 'active' : ''}`}
                    onClick={() => setIsMobileMenuOpen(false)}
                >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                        <circle cx="8.5" cy="7" r="4"></circle>
                        <line x1="20" y1="8" x2="20" y2="14"></line>
                        <line x1="17" y1="11" x2="23" y2="11"></line>
                    </svg>
                    Add Client
                </Link>

                {user?.admin && (
                    <Link 
                        to="/admin/manage-users" 
                        className={`action-btn ${location.pathname === '/admin/manage-users' ? 'active' : ''}`}
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                            <circle cx="12" cy="11" r="3"></circle>
                            <path d="M7 18.5c.5-1 2-2 5-2s4.5 1 5 2"></path>
                        </svg>
                        Admin
                    </Link>
                )}
            </div>

            <div className={`profile-wrapper ${isMobile ? 'mobile' : ''}`}>
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
                        <Button className="logout-button" onClick={() => signOut()} variant="outline" size="small" fullWidth>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                                <polyline points="16 17 21 12 16 7"></polyline>
                                <line x1="21" y1="12" x2="9" y2="12"></line>
                            </svg>
                            Sign Out
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );

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
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="navbar-right desktop-only">
                    {menuContent(false)}
                </div>

                <div className="hamburger" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                    <span className={`bar ${isMobileMenuOpen ? 'open' : ''}`}></span>
                    <span className={`bar ${isMobileMenuOpen ? 'open' : ''}`}></span>
                    <span className={`bar ${isMobileMenuOpen ? 'open' : ''}`}></span>
                </div>
            </nav>

            <div className={`navbar-mobile-menu ${isMobileMenuOpen ? 'open' : ''}`}>
                {menuContent(true)}
            </div>
        </>
    )
}

export default Navbar
