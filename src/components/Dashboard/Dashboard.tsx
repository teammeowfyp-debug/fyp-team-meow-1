import React, { useState } from 'react';
import { useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import ClientHeader from './ClientHeader/ClientHeader';
import PlansHeld from './PlansHeld';
import Insights from './Insights';
import Cashflow from './Cashflow';
import AssetAllocation from './AssetAllocation';
import { UpdateClientModal } from './ClientHeader/UpdateClientModal';
import { useDashboardData } from '../../hooks/useDashboardData';
import './Dashboard.css';

const Dashboard: React.FC = () => {
    const { clientId } = useParams<{ clientId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const [showPdfImport, setShowPdfImport] = useState(false);

    const {
        client,
        loading,
        startDate,
        endDate,
        absoluteBounds,
        riskAnalysisCache,
        insightsMode,
        setInsightsMode,
        handleStartDateChange,
        handleEndDateChange,
        handleRiskCacheUpdate,
        handleSetMaxRange,
        refreshData
    } = useDashboardData(clientId);

    // Map the pathname to a quadrantId (removing the leading slash and clientId)
    const quadrantId = location.pathname.split('/').pop();
    const isFocused = quadrantId !== "" && quadrantId !== clientId && quadrantId !== undefined;

    if (!clientId) {
        return (
            <div className="dashboard-container animate-fade">
                <div className="empty-state-container glass-card no-hover">
                    <div className="empty-state-icon">
                        <svg
                            width="64"
                            height="64"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="var(--primary)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ filter: 'drop-shadow(0 0 10px var(--primary-glow))' }}
                        >
                            <circle cx="11" cy="11" r="8"></circle>
                            <line x1="22" y1="22" x2="17.5" y2="17.5" strokeWidth="3"></line>
                        </svg>
                    </div>
                    <h2>No Client Selected</h2>
                    <p>Please use the search bar above to select a client and view their financial dashboard.</p>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="dashboard-container animate-fade">
                <div className="empty-state-container glass-card no-hover">
                    <div className="empty-state-icon">
                        <svg
                            width="64"
                            height="64"
                            viewBox="0 0 24 24"
                            stroke="var(--primary)"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{
                                filter: 'drop-shadow(0 0 15px var(--primary-glow))',
                                animation: 'hourglassFlip 1.2s cubic-bezier(0.45, 0.05, 0.55, 0.95) infinite'
                            }}
                        >
                            <path d="M5 2h14l-7 9.5-7-9.5z" fill="var(--bg-main)"></path>
                            <path d="M5 22h14l-7-9.5-7 9.5z" fill="var(--bg-main)"></path>
                        </svg>
                    </div>
                    <h2>Loading Client Data</h2>
                    <p>Fetching the latest financial records...</p>
                </div>
            </div>
        );
    }

    if (!client && !loading) return <div className="error-text">Client not found.</div>;

    const dateRange = { startDate, endDate };

    const renderFullGrid = () => (
        <main className="dashboard-grid">
            <Link to={`/${clientId}/cashflow`} className="quadrant-link animate-fade-in stagger-1">
                <Cashflow client={client} dateRange={dateRange} />
            </Link>
            <Link to={`/${clientId}/plans`} className="quadrant-link animate-fade-in stagger-2">
                <PlansHeld client={client} mode="overview" dateRange={dateRange} />
            </Link>
            <Link to={`/${clientId}/asset-allocation`} className="quadrant-link animate-fade-in stagger-3">
                <AssetAllocation client={client} dateRange={dateRange} />
            </Link>
            <div
                onClick={() => navigate(`/${clientId}/risk`)}
                className="quadrant-link animate-fade-in stagger-4"
                style={{ cursor: 'pointer', textDecoration: 'none' }}
            >
                <Insights
                    clientId={clientId}
                    client={client}
                    mode="overview"
                    dateRange={dateRange}
                    cache={riskAnalysisCache[clientId!]}
                    onCacheUpdate={handleRiskCacheUpdate}
                    insightsMode={insightsMode}
                    onInsightsModeChange={setInsightsMode}
                />
            </div>
        </main>
    );

    const renderFocusedQuadrant = () => {
        switch (quadrantId) {
            case 'asset-allocation': return <AssetAllocation client={client} mode="focused" dateRange={dateRange} />;
            case 'cashflow': return <Cashflow client={client} mode="focused" dateRange={dateRange} />;
            case 'plans': return <PlansHeld client={client} mode="focused" dateRange={dateRange} />;
            case 'risk': return (
                <Insights
                    clientId={clientId}
                    client={client}
                    mode="focused"
                    dateRange={dateRange}
                    cache={riskAnalysisCache[clientId!]}
                    onCacheUpdate={handleRiskCacheUpdate}
                    insightsMode={insightsMode}
                    onInsightsModeChange={setInsightsMode}
                />
            );
            default: return null;
        }
    };

    return (
        <div className="dashboard-container">
            <ClientHeader
                client={client}
                showBack={isFocused}
                onBack={() => navigate(`/${clientId}`)}
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
                onSetMaxRange={handleSetMaxRange}
                absoluteBounds={absoluteBounds}
                onImportPdf={() => setShowPdfImport(true)}
                cache={clientId ? riskAnalysisCache[clientId] : null}
                dashboardStartDate={startDate}
                dashboardEndDate={endDate}
                onFocusQuadrant={(quadId: string, mode?: string) => {
                    if (quadId === 'risk' && mode) {
                        setInsightsMode(mode as 'risk-analysis' | 'meeting-notes');
                    }
                    navigate(`/${clientId}/${quadId}`);
                }}
            />
            {isFocused ? (
                <main className="focused-view animate-fade-in">
                    {renderFocusedQuadrant()}
                </main>
            ) : (
                <div>
                    {renderFullGrid()}
                </div>
            )}
            {showPdfImport && clientId && (
                <UpdateClientModal
                    clientId={clientId}
                    onClose={() => setShowPdfImport(false)}
                    onSuccess={() => {
                        setShowPdfImport(false);
                        // Refresh client data via hook instead of hard reload if possible
                        refreshData();
                    }}
                />
            )}
        </div>
    );
};

export default Dashboard;
