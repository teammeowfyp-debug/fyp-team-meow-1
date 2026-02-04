import React from 'react';
import './Dashboard.css';

interface ClientHeaderProps {
    onBack?: () => void;
    showBack?: boolean;
}

const ClientHeader: React.FC<ClientHeaderProps> = ({ onBack, showBack }) => {
    const clientInfo = {
        name: 'Jonathan Sterling',
        age: 42,
        dob: '12 May 1983',
        id: 'ID-992841-B',
        lastUpdated: '04 Feb 2026, 12:45 PM',
        netWorth: '$2,485,900.00',
    };

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
                <div className="client-avatar">JS</div>
                <div className="client-details">
                    <h1>{clientInfo.name}</h1>
                    <div className="meta-pills">
                        <span className="pill">Age: {clientInfo.age}</span>
                        <span className="pill">DOB: {clientInfo.dob}</span>
                        <span className="pill">ID: {clientInfo.id}</span>
                    </div>
                </div>
            </div>
            <div className="header-stats">
                <div className="stat-group">
                    <span className="label">Grand Net Worth</span>
                    <span className="value net-worth">{clientInfo.netWorth}</span>
                </div>
                <div className="stat-group align-end">
                    <span className="label">Last Updated</span>
                    <span className="value timestamp">{clientInfo.lastUpdated}</span>
                </div>
            </div>
        </header>
    );
};

export default ClientHeader;
