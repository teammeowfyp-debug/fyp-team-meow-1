import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../lib/AuthProvider';
import ClientHeader from './ClientHeader';
import PlansHeld from './quadrants/PlansHeld';
import RiskProfile from './quadrants/RiskProfile';
import Cashflow from './quadrants/Cashflow';
import AssetAllocation from './quadrants/AssetAllocation';
import { PdfImport } from './PdfImport';
import './Dashboard.css';

const Dashboard: React.FC = () => {
    const { clientId } = useParams<{ clientId: string }>();
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(!!clientId);
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [riskAnalysisCache, setRiskAnalysisCache] = useState<Record<string, {
        overview?: string;
        focused?: any;
    }>>({});
    const [absoluteBounds, setAbsoluteBounds] = useState<{ start: string; end: string } | null>(null);
    const [showPdfImport, setShowPdfImport] = useState(false);

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = e.target.value;
        setStartDate(newStart);
        // Ensure start date is not after end date
        if (newStart && endDate && newStart > endDate) {
            setEndDate(newStart);
        }
    };

    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEnd = e.target.value;
        setEndDate(newEnd);
        // Ensure end date is not before start date
        if (newEnd && startDate && newEnd < startDate) {
            setStartDate(newEnd);
        }
    };

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
                        client_family (*),
                        client_investments (
                            *,
                            investment_valuations (
                                current_value,
                                as_of_date
                            )
                        ),
                        client_insurance (
                            *,
                            insurance_valuations (
                                current_value,
                                as_of_date
                            )
                        ),
                        cashflow (
                            as_of_date,
                            employment_income_gross,
                            rental_income,
                            investment_income,
                            household_expenses,
                            income_tax,
                            insurance_premiums,
                            property_expenses,
                            property_loan_repayment,
                            non_property_loan_repayment,
                            cpf_contribution_total,
                            regular_investments,
                            total_inflow,
                            total_expense,
                            wealth_transfers,
                            net_surplus,
                            net_cashflow
                        )
                    `)
                    .eq('client_id', clientId)
                    .single();

                if (error) throw error;

                // Staff can only view their assigned clients; admins can view all
                if (data && user && !user.admin) {
                    if (!user.userId || data.assigned_user_id !== user.userId) {
                        setClient(null);
                        setLoading(false);
                        return;
                    }
                }

                if (data) {
                    // Map new schema to old structure for backward compatibility with child components
                    data.family_members_count = data.client_family?.length || 0;
                    data.full_name = data.name_as_per_id;

                    const mappedInvestments = (data.client_investments || []).map((inv: any) => ({
                        ...inv,
                        plan_id: inv.policy_id,
                        plan_name: inv.policy_name,
                        asset_class: inv.policy_type,
                        start_date: inv.start_date,
                        end_date: inv.expiry_date,
                        investment_valuations: (inv.investment_valuations || []).map((v: any) => ({
                            ...v,
                            market_value: v.current_value
                        }))
                    }));

                    const mappedInsurance = (data.client_insurance || []).map((ins: any) => ({
                        ...ins,
                        plan_id: ins.policy_id,
                        plan_name: ins.policy_name,
                        asset_class: ins.policy_type,
                        start_date: ins.start_date,
                        end_date: ins.expiry_date,
                        insurance_valuations: (ins.insurance_valuations || []).map((v: any) => ({
                            ...v,
                            cash_value: v.current_value,
                            // Fallbacks for missing benefit columns in new schema
                            death_benefit: ins.sum_assured || 0,
                            critical_illness_benefit: 0,
                            disability_benefit: 0
                        }))
                    }));

                    data.client_plans = [...mappedInvestments, ...mappedInsurance];

                    // Calculate absolute bounds for date filtering
                    const allDates: string[] = [];
                    data.cashflow?.forEach((c: any) => allDates.push(c.as_of_date));
                    data.client_plans.forEach((p: any) => {
                        if (p.start_date) allDates.push(p.start_date);
                        if (p.end_date) allDates.push(p.end_date);
                    });

                    if (allDates.length > 0) {
                        const sorted = allDates.map(d => d.substring(0, 10)).sort();
                        const bounds = {
                            start: sorted[0],
                            end: sorted[sorted.length - 1]
                        };
                        setAbsoluteBounds(bounds);

                        // Default to Max Range on load
                        setStartDate(bounds.start);
                        setEndDate(bounds.end);
                    }

                    setClient(data);
                }
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
                <div className="empty-state-container glass-card">
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

    const handleRiskCacheUpdate = (update: { overview?: string; focused?: any }) => {
        if (!clientId) return;
        setRiskAnalysisCache(prev => ({
            ...prev,
            [clientId]: { ...(prev[clientId] || {}), ...update }
        }));
    };

    const renderFullGrid = () => (
        <main className="dashboard-grid">
            <Link to={`/${clientId}/asset-allocation`} className="quadrant-link">
                <AssetAllocation client={client} dateRange={dateRange} />
            </Link>
            <Link to={`/${clientId}/cashflow`} className="quadrant-link">
                <Cashflow client={client} dateRange={dateRange} />
            </Link>
            <Link to={`/${clientId}/plans`} className="quadrant-link">
                <PlansHeld client={client} mode="overview" dateRange={dateRange} />
            </Link>
            <Link to={`/${clientId}/risk`} className="quadrant-link">
                <RiskProfile
                    clientId={clientId}
                    client={client}
                    mode="overview"
                    dateRange={dateRange}
                    cache={riskAnalysisCache[clientId!]}
                    onCacheUpdate={handleRiskCacheUpdate}
                />
            </Link>
        </main>
    );

    const renderFocusedQuadrant = () => {
        switch (quadrantId) {
            case 'asset-allocation': return <AssetAllocation client={client} mode="focused" dateRange={dateRange} />;
            case 'cashflow': return <Cashflow client={client} mode="focused" dateRange={dateRange} />;
            case 'plans': return <PlansHeld client={client} mode="focused" dateRange={dateRange} />;
            case 'risk': return (
                <RiskProfile
                    clientId={clientId}
                    client={client}
                    mode="focused"
                    dateRange={dateRange}
                    cache={riskAnalysisCache[clientId!]}
                    onCacheUpdate={handleRiskCacheUpdate}
                />
            );
            default: return null;
        }
    };

    return (
        <div className="dashboard-container animate-fade">
            <ClientHeader
                client={client}
                showBack={isFocused}
                onBack={() => navigate(`/${clientId}`)}
                startDate={startDate}
                endDate={endDate}
                onStartDateChange={handleStartDateChange}
                onEndDateChange={handleEndDateChange}
                onSetMaxRange={() => {
                    if (absoluteBounds) {
                        setStartDate(absoluteBounds.start);
                        setEndDate(absoluteBounds.end);
                    }
                }}
                absoluteBounds={absoluteBounds}
                onImportPdf={() => setShowPdfImport(true)}
            />
            {isFocused ? (
                <main className="focused-view">
                    {renderFocusedQuadrant()}
                </main>
            ) : (
                <div>
                    {renderFullGrid()}
                </div>
            )}
            {showPdfImport && clientId && (
                <PdfImport
                    clientId={clientId}
                    onClose={() => setShowPdfImport(false)}
                    onSuccess={() => {
                        setShowPdfImport(false);
                        // Refresh client data
                        setClient(null);
                        setLoading(true);
                        // Trigger re-fetch by temporarily clearing clientId effect
                        window.location.reload();
                    }}
                />
            )}
        </div>
    );
};

export default Dashboard;
