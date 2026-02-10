import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import './Dashboard.css';

interface ClientHeaderProps {
    onBack?: () => void;
    showBack?: boolean;
}

interface ClientData {
    client_id: string;
    full_name: string;
    risk_profile: string;
    risk_assessment_date: string;
}

const ClientHeader: React.FC<ClientHeaderProps> = ({ onBack, showBack }) => {
    const { clientId } = useParams<{ clientId: string }>();
    const [client, setClient] = useState<ClientData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchClientData = async () => {
            try {
                setLoading(true);

                let query = supabase
                    .from('clients')
                    .select('client_id, full_name, risk_profile, risk_assessment_date');

                if (clientId) {
                    query = query.eq('client_id', clientId);
                } else {
                    query = query.limit(1);
                }

                const { data, error: sbError } = await query.maybeSingle();

                if (sbError) throw sbError;
                setClient(data);
            } catch (err: any) {
                console.error('Error fetching client:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchClientData();
    }, [clientId]);

    if (loading) {
        return (
            <header className="dashboard-header glass animate-pulse">
                <div className="client-meta">
                    <div className="client-avatar" style={{ background: '#333' }}>--</div>
                    <div className="client-details">
                        <div style={{ height: '32px', width: '200px', background: '#333', borderRadius: '8px' }}></div>
                        <div className="meta-pills" style={{ marginTop: '12px' }}>
                            <div style={{ height: '24px', width: '80px', background: '#333', borderRadius: '12px' }}></div>
                        </div>
                    </div>
                </div>
            </header>
        );
    }

    if (error || !client) {
        return (
            <header className="dashboard-header glass">
                <div className="client-meta">
                    <div className="client-details">
                        <h1 style={{ color: 'var(--accent)' }}>System Error</h1>
                        <p>{error || 'No client found in database.'}</p>
                    </div>
                </div>
            </header>
        );
    }

    // Generate initials for avatar
    const initials = client.full_name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

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
                        <span className="pill risk-pill">{client.risk_profile} Profile</span>
                    </div>
                </div>
            </div>
            <div className="header-stats">
                <div className="stat-group">
                    <span className="label">Risk Assessment Date</span>
                    <span className="value timestamp">
                        {new Date(client.risk_assessment_date).toLocaleDateString('en-SG', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                        })}
                    </span>
                </div>
                <div className="stat-group align-end">
                    <span className="label">Status</span>
                    <span className="value success">Active Client</span>
                </div>
            </div>
        </header>
    );
};

export default ClientHeader;
