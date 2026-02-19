import React, { useState, useEffect } from 'react';
import { generateRiskAnalysis, generateRiskSummary } from '../../lib/riskProfileAI';

interface RiskProfileProps {
    clientId?: string;
    client?: any;
    mode?: 'overview' | 'focused';
}

const RiskProfile: React.FC<RiskProfileProps> = ({ client, mode = 'overview' }) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<string>('');
    const [clientInfo, setClientInfo] = useState<{
        category: string;
        date: string;
    } | null>(null);

    const [structuredAnalysis, setStructuredAnalysis] = useState<{
        "Key Insights": string;
        "Potential Risks": string;
        "Recommendations": string;
    } | null>(null);

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
                const allocationMap: Record<string, number> = { 'Equity': 0, 'Fixed Income': 0, 'Cash': 0 };
                let totalValue = 0;

                client.client_plans?.forEach((plan: any) => {
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

                const latestCashflow = client.monthly_cashflow?.sort((a: any, b: any) =>
                    new Date(b.month_year).getTime() - new Date(a.month_year).getTime()
                )[0];

                const cashflowString = latestCashflow
                    ? `Inflow: $${latestCashflow.total_inflow}, Outflow: $${latestCashflow.total_outflow}, Net: $${latestCashflow.net_surplus} (${new Date(latestCashflow.month_year).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })})`
                    : 'No cashflow data';

                const plansString = client.client_plans?.length > 0
                    ? client.client_plans.map((p: any) => p.plan_name).join(', ')
                    : 'No active plans';

                const params = {
                    riskProfileCategory: client.risk_profile || 'Unknown',
                    investmentAllocation: allocationString,
                    cashflow: cashflowString,
                    plansHeld: plansString,
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
                <h3>Risk Profile</h3>
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

export default RiskProfile;
