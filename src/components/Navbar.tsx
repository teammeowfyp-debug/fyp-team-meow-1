import React from 'react'
import { Link } from 'react-router-dom'
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
                <div className="nav-actions">
                    {!user ? (
                        <Link to="/login" className="login-link">Login</Link>
                    ) : (
                        <div className="signed-in">
                            <span className="signed-in-email">{user.email}</span>
                            <button className="login-link" onClick={() => signOut()}>Logout</button>
                        </div>
                    )}
                </div>

                <div className="advisor-profile">
                    <div className="advisor-info">
                        <span className="advisor-name">Marcus Tan</span>
                        <span className="advisor-role">Premier Advisor</span>
                    </div>
                    <div className="advisor-avatar">MT</div>
                </div>
            </div>
        </nav>
    )
}

export default Navbar
