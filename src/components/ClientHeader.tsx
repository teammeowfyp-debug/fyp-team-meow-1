import React from 'react';
import './Dashboard.css';

interface ClientHeaderProps {
    client: any;
    onBack?: () => void;
    showBack?: boolean;
}

const ClientHeader: React.FC<ClientHeaderProps> = ({ client, onBack, showBack }) => {
    if (!client) return null;

    // Generate initials for avatar
    const initials = client.full_name
        ? client.full_name
            .split(' ')
            .map((n: string) => n[0])
            .join('')
            .toUpperCase()
            .slice(0, 2)
        : '--';

    return (
        <header className="dashboard-header glass">
            <div className="client-meta">
                {showBack && (
                    <button className="back-button" onClick={onBack} aria-label="Go back">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="19" y1="12" x2="5" y2="12"></line>
                            <polyline points="12 19 5 12 12 5"></polyline>
                        </svg>
                    </button>
                )}
                <div className="client-avatar">{initials}</div>
                <div className="client-details">
                    <h1>{client.full_name}</h1>
                    <div className="meta-pills">
                        <span className="pill">ID: {client.client_id}</span>
                    </div>
                </div>
            </div>
            <div className="header-stats">
                <div className="stat-group align-end">
                    <span className="label">Status</span>
                    <span className="value success">Active Client</span>
                </div>
            </div>
        </header>
    );
};

export default ClientHeader;
