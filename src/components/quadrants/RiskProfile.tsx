import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { generateRiskAnalysis, generateRiskSummary } from '../../lib/riskProfileAI';

interface RiskProfileProps {
    clientId?: string;
    client?: any;
    mode?: 'overview' | 'focused';
    dateRange?: { startDate: string; endDate: string };
    cache?: { overview?: string; focused?: any } | null;
    onCacheUpdate?: (update: { overview?: string; focused?: any }) => void;
}

const RISK_LEVEL_DESCRIPTIONS: Record<string, string> = {
    'Level 1': 'You seek to preserve capital and understand that potential investment returns, when adjusted for inflation, may be very low or even zero. You are willing to accept a very low volatility in your investment(s).',
    'Level 2': 'You seek small capital growth and understand that potential investment income and capital gains come with some short term fluctuations. You are willing to accept low volatility in your investment(s).',
    'Level 3': 'You seek moderate capital growth and understand that potential moderate investment returns over the medium term come with relatively higher risks. You are willing to accept medium volatility in your investment(s) over the short term.',
    'Level 4': 'You seek high capital gains and understand that potential higher investment returns over the long term come with relatively higher risks. You are willing to accept high volatility in your investment(s) over the short to medium term.'
};

const RiskLevelInfoModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: '600px', padding: '2.5rem',
                background: '#fff', borderRadius: '24px', boxShadow: 'var(--shadow-xl)',
                position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', fontSize: '1.75rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                >&times;</button>

                <h2 style={{ fontSize: '1.5rem', color: 'var(--secondary)', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>Risk Level Guide</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {Object.entries(RISK_LEVEL_DESCRIPTIONS).map(([level, desc]) => (
                        <div key={level}>
                            <h4 style={{ color: 'var(--primary)', marginBottom: '6px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {level}
                            </h4>
                            <p style={{ fontSize: '0.9rem', color: 'var(--secondary)', lineHeight: '1.5', opacity: 0.85 }}>{desc}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body
    );
};

const AIInfoModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose} style={{
            position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
            background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
            backdropFilter: 'blur(4px)'
        }}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{
                width: '100%', maxWidth: '700px', padding: '2.5rem',
                background: '#fff', borderRadius: '24px', boxShadow: 'var(--shadow-xl)',
                position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', fontSize: '1.75rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                >&times;</button>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                    <h2 style={{ fontSize: '1.5rem', color: 'var(--secondary)', margin: 0 }}>How AI Generates This Analysis</h2>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <section>
                        <p style={{ fontSize: '0.9rem', color: 'var(--secondary)', lineHeight: '1.5', opacity: 0.85 }}>
                            Our AI synthesizes real-time data from four key pillars:
                        </p>
                        <ol style={{ fontSize: '0.85rem', color: 'var(--secondary)', opacity: 0.85, marginTop: '8px', paddingLeft: '20px' }}>
                            <li><strong>Risk Profile:</strong> Stated risk tolerance levels.</li>
                            <li><strong>Investment Allocation:</strong> Asset distribution across classes.</li>
                            <li><strong>Cashflow:</strong> Inflows, outflows, and net surplus capacity.</li>
                            <li><strong>Plans Held:</strong> Liquidity, lock-in periods, and coverage details.</li>
                        </ol>
                    </section>

                    <section>
                        <h4 style={{ color: 'var(--primary)', marginBottom: '8px', fontSize: '1rem' }}>Analysis Logic</h4>
                        <div style={{ background: 'rgba(0,0,0,0.02)', padding: '15px', borderRadius: '12px', borderLeft: '3px solid var(--primary)' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--secondary)', lineHeight: '1.6', margin: 0 }}>
                                <strong>Allocation Alignment:</strong> Checks if asset volatility matches expected risk levels.<br />
                                <strong>Capacity vs. Tolerance:</strong> Verifies if cashflow supports risk appetite.<br />
                                <strong>Structural Review:</strong> Identifies conflicts between illiquid assets and flexibility needs.<br />
                                <strong>The Gap:</strong> Pinpoints the exact delta between current reality and profile goals.
                            </p>
                        </div>
                    </section>

                    <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                        This analysis is supplementary and should be reviewed by a professional advisor before informing any financial decisions.
                    </p>
                </div>
            </div>
        </div>,
        document.body
    );
};

const RiskProfile: React.FC<RiskProfileProps> = ({
    client,
    mode = 'overview',
    cache,
    onCacheUpdate
}) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<string>(cache?.overview || '');
    const [clientInfo, setClientInfo] = useState<{
        category: string;
        description: string;
        date: string;
    } | null>(null);

    const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);
    const [structuredAnalysis, setStructuredAnalysis] = useState<{
        "Key Insights": string;
        "Potential Risks": string;
        "Recommendations": string;
    } | null>(cache?.focused || null);
    const [copied, setCopied] = useState<boolean>(false);

    const aiDisclaimerPill = (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: mode === 'overview' ? 0 : '4px 0 12px 0',
            marginTop: mode === 'overview' ? '0' : 'auto'
        }}>
            <button
                onClick={() => setIsAIModalOpen(true)}
                style={{
                    fontSize: '0.65rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(0, 0, 0, 0.03)',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    border: '1px solid var(--border)',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.06)';
                    e.currentTarget.style.color = 'var(--secondary)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)';
                    e.currentTarget.style.color = 'var(--text-muted)';
                }}
            >
                <span style={{ fontSize: '0.8rem' }}>✨</span>
                This analysis is generated by AI
            </button>
        </div>
    );

    useEffect(() => {
        if (!client) return;

        // Reset local states if cache is null (new client/leaves page)
        if (!cache) {
            setSummary('');
            setStructuredAnalysis(null);
        }

        const analyze = async () => {
            // 1. Check if already cached for this mode
            if (mode === 'overview' && cache?.overview) {
                setSummary(cache.overview);
                setClientInfo({
                    category: client.risk_profile || 'Level 2',
                    description: RISK_LEVEL_DESCRIPTIONS[client.risk_profile] || RISK_LEVEL_DESCRIPTIONS['Level 2'],
                    date: client.last_updated || new Date().toISOString()
                });
                return;
            }
            if (mode === 'focused' && cache?.focused) {
                setStructuredAnalysis(cache.focused);
                setClientInfo({
                    category: client.risk_profile || 'Level 2',
                    description: RISK_LEVEL_DESCRIPTIONS[client.risk_profile] || RISK_LEVEL_DESCRIPTIONS['Level 2'],
                    date: client.last_updated || new Date().toISOString()
                });
                return;
            }

            setLoading(true);
            setError(null);
            // Don't clear if potentially switching back? But analyze is called on mount/prop change.
            // If we are here, we need a new analysis.

            try {
                const category = client.risk_profile || 'Level 2';
                const description = RISK_LEVEL_DESCRIPTIONS[category] || RISK_LEVEL_DESCRIPTIONS['Level 2'];

                setClientInfo({
                    category,
                    description,
                    date: client.last_updated || new Date().toISOString()
                });

                // 2. Aggregate Active Plans for Analysis (Concise & Token-Efficient)
                const activePlans = (client.client_plans || []).filter((p: any) => p.status === 'Active');
                const allocationMap: Record<string, number> = {};
                let totalInvestValue = 0;
                let totalSumAssured = 0;
                let earliestStart: Date | null = null;
                let latestEnd: Date | null = null;
                const activeCategories = new Set<string>();

                activePlans.forEach((plan: any) => {
                    const isInsurance = plan.asset_class?.includes('Insurance') || plan.sum_assured !== undefined;
                    const valuations = isInsurance ? plan.insurance_valuations : plan.investment_valuations;
                    const valueKey = isInsurance ? 'cash_value' : 'market_value';

                    // 1. Track Types/Categories
                    const cat = plan.asset_class || plan.policy_type;
                    if (cat) activeCategories.add(cat);

                    // 2. Track Dates
                    if (plan.start_date) {
                        const d = new Date(plan.start_date);
                        if (!earliestStart || d < earliestStart) earliestStart = d;
                    }
                    const endDateStr = plan.end_date || plan.expiry_date;
                    if (endDateStr) {
                        const d = new Date(endDateStr);
                        if (!latestEnd || d > latestEnd) latestEnd = d;
                    }

                    // 3. Track Valuations (Aggregate & Allocation)
                    const latestVal = valuations?.sort((a: any, b: any) =>
                        new Date(b.as_of_date).getTime() - new Date(a.as_of_date).getTime()
                    )[0];

                    if (latestVal) {
                        const val = parseFloat(latestVal[valueKey] || 0);
                        if (!isInsurance) {
                            totalInvestValue += val;
                            allocationMap[cat] = (allocationMap[cat] || 0) + val;
                        }
                    }
                    if (isInsurance && plan.sum_assured) {
                        totalSumAssured += parseFloat(plan.sum_assured);
                    }
                });

                const allocationString = totalInvestValue > 0
                    ? Object.entries(allocationMap)
                        .filter(([_, val]) => val > 0)
                        .map(([category, val]) => `${Math.round((val / totalInvestValue) * 100)}% ${category}`)
                        .join(', ')
                    : 'No allocation data';

                const latestCashflow = client.cashflow?.sort((a: any, b: any) =>
                    new Date(b.as_of_date).getTime() - new Date(a.as_of_date).getTime()
                )[0];

                const cashflowString = latestCashflow
                    ? `Data as of ${new Date(latestCashflow.as_of_date).toLocaleDateString('en-SG', { month: 'short', year: 'numeric' })}: 
                       - Income Breakdown: Employment ($${latestCashflow.employment_income_gross}), Rental ($${latestCashflow.rental_income}), Investment ($${latestCashflow.investment_income}). Total Inflow: $${latestCashflow.total_inflow}
                       - Expense Breakdown: Household ($${latestCashflow.household_expenses}), Tax ($${latestCashflow.income_tax}), Insurance ($${latestCashflow.insurance_premiums}), Property ($${latestCashflow.property_expenses}), Debt/Loan ($${latestCashflow.property_loan_repayment + latestCashflow.non_property_loan_repayment}). Total Expense: $${latestCashflow.total_expense}
                       - Net State: Wealth Transfers ($${latestCashflow.wealth_transfers}), Net Surplus ($${latestCashflow.net_surplus}), Net Cashflow (post-investment/pensions) ($${latestCashflow.net_cashflow}).`
                    : 'No cashflow data';

                const plansString = activePlans.length > 0
                    ? `Active Portfolio Summary:
                       - Total Investment Value (Mkt): $${Math.round(totalInvestValue).toLocaleString()}
                       - Total Insurance Sum Assured: $${Math.round(totalSumAssured).toLocaleString()}
                       - Coverage/Holding Period: ${earliestStart ? (earliestStart as Date).toLocaleDateString() : 'Unknown'} to ${latestEnd ? (latestEnd as Date).toLocaleDateString() : 'Ongoing'}
                       - Plan Distribution: ${Array.from(activeCategories).join(', ')}`
                    : 'No active plans';

                const params = {
                    riskProfileCategory: client.risk_profile || 'Unknown',
                    riskProfileDescription: description,
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
                        if (onCacheUpdate) {
                            onCacheUpdate({ focused: parsed });
                        }
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
                        const exSummary = parsed["Executive Summary"] || fullText;
                        setSummary(exSummary);
                        if (onCacheUpdate) {
                            onCacheUpdate({ overview: exSummary });
                        }
                    } catch (parseErr) {
                        console.error('JSON Parse Error for summary:', parseErr);
                        setSummary(fullText);
                        if (onCacheUpdate) {
                            onCacheUpdate({ overview: fullText });
                        }
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

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        let textToCopy = '';
        if (mode === 'overview') {
            textToCopy = summary;
        } else if (mode === 'focused' && structuredAnalysis) {
            textToCopy = `RISK ANALYSIS REPORT\n\n` +
                `KEY INSIGHTS:\n${structuredAnalysis["Key Insights"]}\n\n` +
                `POTENTIAL RISKS:\n${structuredAnalysis["Potential Risks"] || 'None identified.'}\n\n` +
                `RECOMMENDATIONS:\n${structuredAnalysis["Recommendations"]}`;
        }

        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    return (
        <section className="glass-card quadrant">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Risk Analysis</h3>
                {(summary || (mode === 'focused' && structuredAnalysis)) && (
                    <button
                        onClick={handleCopy}
                        style={{
                            background: 'transparent',
                            color: copied ? 'var(--success)' : 'var(--text-muted)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '4px 8px',
                            borderRadius: '20px',
                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                            backgroundColor: copied ? 'rgba(16, 185, 129, 0.08)' : 'rgba(0,0,0,0.02)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            border: copied ? '1px solid var(--success)' : '1px solid var(--border)'
                        }}
                        title="Copy analysis to clipboard"
                    >
                        {copied ? (
                            <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                    <polyline points="20 6 9 17 4 12"></polyline>
                                </svg>
                                <span>Copied</span>
                            </>
                        ) : (
                            <>
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                <span>Copy</span>
                            </>
                        )}
                    </button>
                )}
            </div>

            <div className="risk-indicator" style={mode === 'overview' ? { flex: 1, gap: '1rem' } : { gap: '1rem' }}>
                {clientInfo && (
                    <div className="risk-header-info animate-fade">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                            <div className="risk-category-display" style={{ alignItems: 'center', textAlign: 'center' }}>
                                <span className="label">Current Category</span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                    <span className="value" style={{ fontSize: '2rem' }}>{clientInfo.category}</span>
                                    <button
                                        onClick={() => setIsInfoModalOpen(true)}
                                        style={{
                                            width: '20px',
                                            height: '20px',
                                            borderRadius: '50%',
                                            border: '1px solid var(--border)',
                                            background: 'rgba(0,0,0,0.03)',
                                            fontSize: '0.8rem',
                                            color: 'var(--text-muted)',
                                            cursor: 'pointer',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.2s',
                                            fontWeight: 700,
                                            marginTop: '4px'
                                        }}
                                        title="View Risk Level Guide"
                                        onMouseOver={(e) => {
                                            e.currentTarget.style.background = 'var(--primary)';
                                            e.currentTarget.style.color = '#fff';
                                            e.currentTarget.style.borderColor = 'var(--primary)';
                                        }}
                                        onMouseOut={(e) => {
                                            e.currentTarget.style.background = 'rgba(0,0,0,0.03)';
                                            e.currentTarget.style.color = 'var(--text-muted)';
                                            e.currentTarget.style.borderColor = 'var(--border)';
                                        }}
                                    >
                                        ?
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div className="ai-analysis-content">
                    {loading && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem 0' }}>
                            <div className="loading-shimmer">
                                <div className="line" style={{ width: '90%' }}></div>
                                <div className="line" style={{ width: '100%' }}></div>
                                <div className="line short"></div>
                            </div>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.75rem',
                                color: 'var(--text-muted)'
                            }}>
                                <p style={{ fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.05em' }}>Thinking...</p>
                            </div>
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

                {mode === 'overview' && aiDisclaimerPill}
            </div>

            {mode === 'focused' && aiDisclaimerPill}

            <RiskLevelInfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
            <AIInfoModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />
        </section>
    );
};

export default RiskProfile;
