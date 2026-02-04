import React from 'react'
import { useAuth } from '../lib/AuthProvider'
import './Navbar.css'

const Navbar: React.FC = () => {
    const { user, signOut } = useAuth()

    return (
        <nav className="navbar glass">
            <div className="navbar-left">
                <div className="logo">
                    <span className="logo-icon">▲</span>
                    <span className="logo-text">Calibre</span>
                </div>
            </div>

            <div className="navbar-center">
                <div className="search-container">
                    <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8"></circle>
                        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                    </svg>
                    <input
                        type="text"
                        placeholder="Search clients (e.g. Jonathan...)"
                        className="search-input"
                    />
                    <div className="search-shortcut">⌘K</div>
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
