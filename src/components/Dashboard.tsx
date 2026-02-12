import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { generateRiskAnalysis, generateRiskSummary } from '../lib/riskProfileAI';
import ClientHeader from './ClientHeader';
import './Dashboard.css';

const AssetAllocation: React.FC<{ client?: any }> = ({ client }) => {
    const allocation = client?.investment_allocation || 'No data';

    return (
        <section className="glass-card quadrant">
            <div className="card-header">
                <h3>Asset Allocation</h3>
                <span className="badge">Portfolio</span>
            </div>
            <div className="chart-placeholder">
                <div className="donut-mimic">
                    <div className="donut-center">
                    </div>
                </div>
                <div className="legend">
                    <div className="legend-item">{allocation}</div>
                </div>
            </div>
        </section>
    );
};

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const CashflowAnalysis: React.FC<{ client?: any }> = ({ client }) => {
    // Transform data for the chart
    // We want to show the cashflow history in chronological order
    const chartData = React.useMemo(() => {
        if (!client?.monthly_cashflow_history || client.monthly_cashflow_history.length === 0) {
            return [];
        }

        return [...client.monthly_cashflow_history]
            .sort((a: any, b: any) => new Date(a.month_year).getTime() - new Date(b.month_year).getTime())
            .map((item: any) => ({
                date: new Date(item.month_year).toLocaleDateString('en-SG', { month: 'short', year: '2-digit' }),
                fullDate: new Date(item.month_year).toLocaleDateString('en-SG', { month: 'long', year: 'numeric' }),
                inflow: parseFloat(item.total_inflow),
                outflow: parseFloat(item.total_outflow),
                net: parseFloat(item.net_surplus)
            }));
    }, [client?.monthly_cashflow_history]);

    const hasData = chartData.length > 0;

    // Custom Tooltip for better UX
    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip" style={{
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    padding: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)'
                }}>
                    <p className="tooltip-date" style={{ color: '#fff', marginBottom: '8px', fontWeight: 600 }}>{payload[0].payload.fullDate}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} style={{ color: entry.color, fontSize: '0.9rem', margin: '4px 0' }}>
                            {entry.name}: <span style={{ fontWeight: 600 }}>${entry.value.toLocaleString()}</span>
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <section className="glass-card quadrant">
            <div className="card-header">
                <h3>Cashflow Analysis</h3>
                <span className={`badge ${hasData ? 'success' : ''}`}>{hasData ? 'Active' : 'No Data'}</span>
            </div>
            <div className="chart-container" style={{ width: '100%', height: '250px', marginTop: '10px' }}>
                {hasData ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                            <XAxis
                                dataKey="date"
                                stroke="rgba(255,255,255,0.5)"
                                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="rgba(255,255,255,0.5)"
                                tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 12 }}
                                tickFormatter={(value) => `$${value >= 1000 ? `${value / 1000}k` : value}`}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Line
                                type="monotone"
                                dataKey="inflow"
                                name="Inflow"
                                stroke="#10b981"
                                strokeWidth={2}
                                dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="outflow"
                                name="Outflow"
                                stroke="#ef4444"
                                strokeWidth={2}
                                dot={{ r: 4, fill: '#ef4444', strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                            />
                            <Line
                                type="monotone"
                                dataKey="net"
                                name="Net Surplus"
                                stroke="#3b82f6"
                                strokeWidth={2}
                                dot={{ r: 4, fill: '#3b82f6', strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="chart-placeholder line-chart-mimic">
                        <svg viewBox="0 0 400 150" className="svg-chart">
                            <path d="M0,120 Q50,110 100,80 T200,60 T300,50 T400,20" fill="none" stroke="var(--primary)" strokeWidth="3" />
                            <path d="M0,120 Q50,110 100,80 T200,60 T300,50 T400,20 L400,150 L0,150 Z" fill="url(#gradient)" opacity="0.2" />
                            <defs>
                                <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor="var(--primary)" />
                                    <stop offset="100%" stopColor="transparent" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="chart-labels">
                            <span>Missing</span><span>Financial</span><span>Data</span>
                        </div>
                    </div>
                )}
            </div>
        </section>
    );
};

const PlansHeld: React.FC<{ client?: any }> = ({ client }) => {
    const rawPlans = client?.raw_plans || [];
    const plans = rawPlans.length > 0
        ? rawPlans.map((p: any) => ({ type: p.plan_name, status: 'Active', renewalDate: p.asset_class }))
        : [];

    return (
        <section className="glass-card quadrant">
            <div className="card-header">
                <h3>Plans Held</h3>
                <span className="badge accent">Summary</span>
            </div>
            <div className="plans-table-container">
                <table className="plans-table">
                    <thead>
                        <tr>
                            <th>Plan Type</th>
                            <th>Status</th>
                            <th>Renewal Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {plans.map((plan: any, index: number) => (
                            <tr key={index}>
                                <td>{plan.type}</td>
                                <td>
                                    <span className={`status-pill ${plan.status.toLowerCase().replace(' ', '-')}`}>
                                        {plan.status}
                                    </span>
                                </td>
                                <td>{plan.renewalDate}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

const RiskProfile: React.FC<{
    clientId?: string;
    client?: any;
    mode?: 'overview' | 'focused'
}> = ({ client, mode = 'overview' }) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<string>('');

    useEffect(() => {
        if (!client) return;

        const analyze = async () => {
            setLoading(true);
            setError(null);
            setStructuredAnalysis(null);
            setSummary('');

            try {
                setClientInfo({
                    category: client.risk_profile || 'Moderate',
                    date: client.risk_assessment_date || new Date().toISOString()
                });

                // 2. Prepare parameters for AI (EXCLUSIVELY using database data)
                const params = {
                    riskProfileCategory: client.risk_profile || 'Unknown',
                    investmentAllocation: client.investment_allocation || 'Information not provided',
                    cashflow: client.cashflow_analysis || 'Information not provided',
                    plansHeld: client.plans_summary || 'Information not provided',
                };

                // 3. Trigger AI Analysis based on mode
                if (mode === 'focused') {
                    const stream = generateRiskAnalysis(params);
                    let fullText = '';
                    for await (const chunk of stream) {
                        fullText += chunk;
                    }

                    // 4. Parse JSON
                    try {
                        const parsed = JSON.parse(fullText);
                        setStructuredAnalysis(parsed);
                    } catch (parseErr) {
                        console.error('JSON Parse Error:', parseErr, 'Raw text:', fullText);
                        setError('Received invalid data from AI.');
                    }
                } else {
                    const stream = generateRiskSummary(params);
                    let fullText = '';
                    for await (const chunk of stream) {
                        fullText += chunk;
                    }

                    try {
                        const parsed = JSON.parse(fullText);
                        setSummary(parsed["Executive Summary"] || fullText);
                    } catch (parseErr) {
                        console.error('JSON Parse Error for summary:', parseErr);
                        setSummary(fullText);
                    }
                }
            } catch (err: any) {
                console.error('Risk Analysis Error:', err);
                setError('Failed to load risk analysis.');
            } finally {
                setLoading(false);
            }
        };

        analyze();
    }, [client, mode]);

    const [clientInfo, setClientInfo] = useState<{
        category: string;
        date: string;
    } | null>(null);

    const [structuredAnalysis, setStructuredAnalysis] = useState<{
        "Key Insights": string;
        "Potential Risks": string;
        "Recommendations": string;
    } | null>(null);

    const renderListItems = (text: string) => {
        if (!text) return null;
        // Split by newlines and handle various bullet formats (*, -, •, or numbers)
        const items = text.split(/\n/).filter(line => line.trim().length > 0);
        return items.map((item, i) => (
            <li key={i}>{item.replace(/^[\s*•\-]+/, '').trim()}</li>
        ));
    };

    return (
        <section className="glass-card quadrant">
            <div className="card-header">
                <h3>Risk Profile Analysis</h3>
                <span className={`badge ${loading ? 'animate-pulse' : 'warning'}`}>
                    {loading ? 'AI Thinking...' : 'AI Insights'}
                </span>
            </div>

            <div className="risk-indicator">
                {clientInfo && (
                    <div className="risk-header-info animate-fade">
                        <div className="risk-category-display">
                            <span className="label">Current Category</span>
                            <span className="value">{clientInfo.category}</span>
                        </div>
                        <div className="risk-date-display">
                            <span className="label">Last Assessed</span>
                            <span className="value">
                                {new Date(clientInfo.date).toLocaleDateString('en-SG', {
                                    day: '2-digit',
                                    month: 'short',
                                    year: 'numeric'
                                })}
                            </span>
                        </div>
                    </div>
                )}

                <div className="ai-analysis-content">
                    {loading && !structuredAnalysis && (
                        <div className="loading-shimmer">
                            <div className="line"></div>
                            <div className="line short"></div>
                            <div className="line"></div>
                        </div>
                    )}

                    {error && <p className="error-text">{error}</p>}

                    {mode === 'focused' && structuredAnalysis && (
                        <div className="structured-analysis animate-fade">
                            <div className="analysis-section">
                                <h4>Key Insights</h4>
                                <ul>{renderListItems(structuredAnalysis["Key Insights"])}</ul>
                            </div>

                            {structuredAnalysis["Potential Risks"] && (
                                <div className="analysis-section red-flags">
                                    <h4>Potential Risks</h4>
                                    <ul>{renderListItems(structuredAnalysis["Potential Risks"])}</ul>
                                </div>
                            )}

                            <div className="analysis-section recommendations">
                                <h4>Recommendation</h4>
                                <p>{structuredAnalysis["Recommendations"]}</p>
                            </div>
                        </div>
                    )}

                    {mode === 'overview' && summary && (
                        <div className="analysis-text animate-fade" style={{ fontSize: '0.9rem', opacity: 0.9 }}>
                            {summary}
                        </div>
                    )}

                    {!loading && !structuredAnalysis && !summary && !error && (
                        <p className="risk-description">
                            Select a client to see detailed risk alignment analysis.
                        </p>
                    )}
                </div>
            </div>
        </section>
    );
};

const Dashboard: React.FC = () => {
    const { clientId } = useParams<{ clientId: string }>();
    const location = useLocation();
    const navigate = useNavigate();
    const [client, setClient] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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
                            plan_name,
                            asset_class,
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

                // 1. Process Allocation
                const allocationMap: Record<string, number> = { 'Equity': 0, 'Fixed Income': 0, 'Cash': 0 };
                let totalValue = 0;

                data.client_plans?.forEach((plan: any) => {
                    // Get latest valuation for this plan
                    const latestVal = plan.monthly_valuations?.sort((a: any, b: any) =>
                        new Date(b.as_of_date).getTime() - new Date(a.as_of_date).getTime()
                    )[0];

                    if (latestVal) {
                        const val = parseFloat(latestVal.market_value);
                        allocationMap[plan.asset_class] = (allocationMap[plan.asset_class] || 0) + val;
                        totalValue += val;
                    }
                });

                const allocationString = totalValue > 0
                    ? Object.entries(allocationMap)
                        .filter(([_, val]) => val > 0)
                        .map(([category, val]) => `${Math.round((val / totalValue) * 100)}% ${category}`)
                        .join(', ')
                    : 'No allocation data';

                // 2. Process Cashflow (Latest month)
                const latestCashflow = data.monthly_cashflow?.sort((a: any, b: any) =>
                    new Date(b.month_year).getTime() - new Date(a.month_year).getTime()
                )[0];

                const cashflowString = latestCashflow
                    ? `Inflow: $${latestCashflow.total_inflow}, Outflow: $${latestCashflow.total_outflow}, Net: $${latestCashflow.net_surplus} (${new Date(latestCashflow.month_year).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })})`
                    : 'No cashflow data';

                // 3. Process Plans Summary
                const plansString = data.client_plans?.length > 0
                    ? data.client_plans.map((p: any) => p.plan_name).join(', ')
                    : 'No active plans';

                // Enriched client object for quadrants and AI
                setClient({
                    ...data,
                    investment_allocation: allocationString,
                    cashflow_analysis: cashflowString,
                    monthly_cashflow_history: data.monthly_cashflow, // Pass the raw history for the chart
                    plans_summary: plansString,
                    raw_plans: data.client_plans // Keep raw for the table view
                });
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

    if (loading) return <div className="loading-container glass-card">Loading client data...</div>;
    if (!client && !loading) return <div className="error-text">Client not found.</div>;

    const renderFullGrid = () => (
        <main className="dashboard-grid">
            <Link to={`/${clientId}/asset-allocation`} className="quadrant-link">
                <AssetAllocation client={client} />
            </Link>
            <Link to={`/${clientId}/cashflow`} className="quadrant-link">
                <CashflowAnalysis client={client} />
            </Link>
            <Link to={`/${clientId}/plans`} className="quadrant-link">
                <PlansHeld client={client} />
            </Link>
            <Link to={`/${clientId}/risk`} className="quadrant-link">
                <RiskProfile clientId={clientId} client={client} mode="overview" />
            </Link>
        </main>
    );

    const renderFocusedQuadrant = () => {
        switch (quadrantId) {
            case 'asset-allocation': return <AssetAllocation client={client} />;
            case 'cashflow': return <CashflowAnalysis client={client} />;
            case 'plans': return <PlansHeld client={client} />;
            case 'risk': return <RiskProfile clientId={clientId} client={client} mode="focused" />;
            default: return null;
        }
    };

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

    return (
        <div className="dashboard-container animate-fade">
            <ClientHeader
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
