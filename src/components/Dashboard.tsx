import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import ClientHeader from './ClientHeader';
import PlansHeld from './quadrants/PlansHeld';
import RiskProfile from './quadrants/RiskProfile';
import Cashflow from './quadrants/Cashflow';
import AssetAllocation from './quadrants/AssetAllocation';
import './Dashboard.css';

const Dashboard: React.FC = () => {
    const { clientId } = useParams<{ clientId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(!!clientId);

    useEffect(() => {
        const fetchClientData = async () => {
            if (!clientId) return;
            setLoading(true);
            try {
                // Fetch structured relational data from Supabase
                const { data, error } = await supabase
                    .from('clients')
                    .select(`
                        *,
                        client_plans (
                            plan_id,
                            plan_name,
                            asset_class,
                            start_date,
                            end_date,
                            monthly_valuations (
                                market_value,
                                as_of_date
                            )
                        ),
                        monthly_cashflow (
                            total_inflow,
                            total_outflow,
                            net_surplus,
                            month_year
                        )
                    `)
                    .eq('client_id', clientId)
                    .single();

                if (error) throw error;

                // 1. Enrich raw data for basic access if needed (optional)
                // We'll just pass the raw data and let quadrants handle their own transformation
                setClient(data);
            } catch (err) {
                console.error('Error fetching comprehensive client data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchClientData();
    }, [clientId]);

    // Map the pathname to a quadrantId (removing the leading slash and clientId)
    const quadrantId = location.pathname.split('/').pop();
    const isFocused = quadrantId !== "" && quadrantId !== clientId && quadrantId !== undefined;

    if (!clientId) {
        return (
            <div className="dashboard-container animate-fade">
                <div className="empty-state-container glass-card">
                    <div className="empty-state-icon">🔍</div>
                    <h2>No Client Selected</h2>
                    <p>Please use the search bar above to select a client and view their financial dashboard.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="dashboard-container animate-fade">
                <div className="empty-state-container glass-card">
                    <div className="empty-state-icon loading-spinner-icon">⏳</div>
                    <h2>Loading Client Data</h2>
                    <p>Fetching the latest financial records from Supabase...</p>
                </div>
            </div>
        );
    }
    if (!client && !loading) return <div className="error-text">Client not found.</div>;

    const renderFullGrid = () => (
        <main className="dashboard-grid">
            <Link to={`/${clientId}/asset-allocation`} className="quadrant-link">
                <AssetAllocation client={client} />
            </Link>
            <Link to={`/${clientId}/cashflow`} className="quadrant-link">
                <Cashflow client={client} />
            </Link>
            <Link to={`/${clientId}/plans`} className="quadrant-link">
                <PlansHeld client={client} mode="overview" />
            </Link>
            <Link to={`/${clientId}/risk`} className="quadrant-link">
                <RiskProfile clientId={clientId} client={client} mode="overview" />
            </Link>
        </main>
    );

    const renderFocusedQuadrant = () => {
        switch (quadrantId) {
            case 'asset-allocation': return <AssetAllocation client={client} />;
            case 'cashflow': return <Cashflow client={client} />;
            case 'plans': return <PlansHeld client={client} mode="focused" />;
            case 'risk': return <RiskProfile clientId={clientId} client={client} mode="focused" />;
            default: return null;
        }
    };

    return (
        <div className="dashboard-container animate-fade">
            <ClientHeader
                client={client}
                showBack={isFocused}
                onBack={() => navigate(`/${clientId}`)}
            />
            {isFocused ? (
                <main className="focused-view">
                    {renderFocusedQuadrant()}
                </main>
            ) : (
                renderFullGrid()
            )}
        </div>
    );
};

export default Dashboard;
