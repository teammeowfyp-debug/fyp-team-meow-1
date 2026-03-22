import React, { useState, useEffect } from 'react';
import { generateRiskAnalysis, generateRiskSummary } from '../../../lib/insightsAI';
import { useAIAnalysis } from './useAIAnalysis';
import type { InsightsProps } from './Insights.helpers';
import { RISK_LEVEL_DESCRIPTIONS, buildFinancialContextParams } from './Insights.helpers';
import {
    RiskLevelInfoModal,
    AIInfoModal,
    AIFeedbackModal,
    renderCleanList,
    InlineCopyButton,
    AIDisclaimerPill
} from './Insights.components';

export const RiskAnalysis: React.FC<InsightsProps> = ({
    client,
    mode = 'overview',
    dateRange,
    cache,
    onCacheUpdate
}) => {
    const {
        loading, setLoading,
        error, setError,
        summary, setSummary,
        result: structuredAnalysis, setResult: setStructuredAnalysis,
        copied, handleCopy,
        rating, setRating,
        feedbackComment, setFeedbackComment,
        isSubmittingFeedback, feedbackSubmitted,
        feedbackError, handleFeedbackSubmit,
        reset
    } = useAIAnalysis(client?.client_id, 'risk_analysis');

    const [clientInfo, setClientInfo] = useState<{
        category: string;
        description: string;
        date: string;
    } | null>(null);

    const [isInfoModalOpen, setIsInfoModalOpen] = useState<boolean>(false);
    const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
    const [riskOutputHovered, setRiskOutputHovered] = useState(false);
    const [hasInitiated, setHasInitiated] = useState(false);

    useEffect(() => {
        const isCacheEmpty = !cache || Object.keys(cache).length === 0;
        setHasInitiated(!isCacheEmpty);
    }, [client?.client_id, dateRange?.startDate, dateRange?.endDate]);

    useEffect(() => {
        if (!client) return;

        // Reset local states if cache is null or we're in a new date context
        const isCacheEmpty = !cache || Object.keys(cache).length === 0;
        if (isCacheEmpty) {
            reset();
        } else {
            if (cache?.overview) setSummary(cache.overview);
            if (cache?.focused) setStructuredAnalysis(cache.focused);
        }

        if (!hasInitiated) return;

        const fetchSummary = async () => {
            if (cache?.overview) {
                setSummary(cache.overview);
                setClientInfo({
                    category: client.risk_profile || 'Level 2',
                    description: RISK_LEVEL_DESCRIPTIONS[client.risk_profile] || RISK_LEVEL_DESCRIPTIONS['Level 2'],
                    date: client.last_updated || new Date().toISOString()
                });
            }

            if (!cache?.overview && !summary) {
                setLoading(true);
                setError(null);
                try {
                    const category = client.risk_profile || 'Level 2';
                    const description = RISK_LEVEL_DESCRIPTIONS[category] || RISK_LEVEL_DESCRIPTIONS['Level 2'];
                    setClientInfo({
                        category,
                        description,
                        date: client.last_updated || new Date().toISOString()
                    });

                    const params = buildFinancialContextParams(client, dateRange);
                    if (!params) return;

                    const stream = generateRiskSummary(params);
                    let fullText = '';
                    for await (const chunk of stream) {
                        fullText += chunk;
                    }

                    try {
                        const parsed = JSON.parse(fullText);
                        const exSummary = parsed["Executive Summary"] || fullText;
                        setSummary(exSummary);
                        if (onCacheUpdate) onCacheUpdate({ overview: exSummary });
                    } catch (parseErr) {
                        setSummary(fullText);
                        if (onCacheUpdate) onCacheUpdate({ overview: fullText });
                    }
                } catch (err: any) {
                    setError(err.message === 'Load failed' || err.message === 'Failed to fetch' ? 'AI Service unreachable.' : 'Failed to load summary.');
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchSummary();
    }, [client, dateRange?.endDate, cache, hasInitiated]);

    useEffect(() => {
        if (mode !== 'focused') return;
        if (!client || !summary || structuredAnalysis || loading) return;
        if (!hasInitiated) return;

        const generateFullAnalysis = async () => {
            setLoading(true);
            setError(null);
            try {
                const params = buildFinancialContextParams(client, dateRange);
                if (!params) return;
                const stream = generateRiskAnalysis(params);
                let fullText = '';
                for await (const chunk of stream) {
                    fullText += chunk;
                }
                const parsed = JSON.parse(fullText);
                setStructuredAnalysis(parsed);
                if (onCacheUpdate) onCacheUpdate({ focused: parsed });
            } catch (err: any) {
                setError('Failed to generate full risk analysis.');
            } finally {
                setLoading(false);
            }
        };

        generateFullAnalysis();
    }, [mode, summary, structuredAnalysis, client, hasInitiated, loading]);

    const onCopyClicked = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        let textToCopy = 'RISK ANALYSIS\n\n';
        if (mode === 'overview') {
            textToCopy += `Summary:\n${summary}`;
        } else if (mode === 'focused') {
            if (summary) textToCopy += `Summary:\n${summary}\n\n`;
            if (structuredAnalysis) {
                textToCopy += `Key Insights:\n${structuredAnalysis["Key Insights"]}\n\n` +
                    `Potential Risks:\n${structuredAnalysis["Potential Risks"] || 'None identified.'}\n\n` +
                    `Recommendations:\n${structuredAnalysis["Recommendations"]}`;
            }
        }
        handleCopy(textToCopy);
    };

    const handleFeedbackSubmitLocal = () => {
        const formattedContent = structuredAnalysis
            ? `Key Insights:\n${structuredAnalysis["Key Insights"]}\n\n` +
            `Potential Risks:\n${structuredAnalysis["Potential Risks"]}\n\n` +
            `Recommendations:\n${structuredAnalysis["Recommendations"]}`
            : (summary ? `Summary:\n${summary}` : '');
        handleFeedbackSubmit(formattedContent);
    };

    return (
        <>
            <div className="risk-indicator" style={{ flex: 1, gap: '1rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {clientInfo && (
                    <div className="risk-header-info animate-fade">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center', justifyContent: 'center', width: '100%' }}>
                            <div
                                className="risk-category-display"
                                style={{
                                    display: 'flex',
                                    flexDirection: mode === 'overview' ? 'row' : 'column',
                                    alignItems: mode === 'overview' ? 'baseline' : 'center',
                                    justifyContent: mode === 'overview' ? 'center' : 'center',
                                    textAlign: mode === 'overview' ? 'left' : 'center',
                                    gap: mode === 'overview' ? '0.75rem' : '0.25rem'
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: mode === 'overview' ? 'baseline' : 'center',
                                    gap: '8px'
                                }}>
                                    <span className="label" style={{ marginBottom: 0, whiteSpace: 'nowrap' }}>Current Category:</span>
                                    {mode === 'focused' && (
                                        <button
                                            onClick={() => setIsInfoModalOpen(true)}
                                            style={{
                                                width: '18px',
                                                height: '18px',
                                                borderRadius: '50%',
                                                border: '1px solid var(--border)',
                                                background: 'rgba(0,0,0,0.03)',
                                                color: 'var(--text-muted)',
                                                cursor: 'pointer',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                transition: 'all 0.2s',
                                                padding: 0,
                                                marginTop: '-2px',
                                                fontSize: '0.75rem',
                                                fontWeight: 600
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
                                    )}
                                </div>
                                <span className="value" style={{
                                    fontSize: mode === 'overview' ? '1.25rem' : '2rem',
                                    color: 'var(--accent)',
                                    fontWeight: 700
                                }}>
                                    {clientInfo.category}
                                </span>
                            </div>
                        </div>
                    </div>
                )}

                <div className="ai-analysis-content" style={{ minHeight: 0, flex: 1 }}
                    onMouseEnter={() => setRiskOutputHovered(true)}
                    onMouseLeave={() => setRiskOutputHovered(false)}
                >
                    {(summary || (mode === 'focused' && structuredAnalysis)) && (
                        <InlineCopyButton onClick={onCopyClicked} isCopied={copied} visible={riskOutputHovered} />
                    )}
                    <div className="ai-analysis-scroll-area">
                        {error && <p className="error-text">{error}</p>}
                        {mode === 'focused' && (
                            <div className="structured-analysis animate-fade">
                                {summary && (
                                    <div className="analysis-section">
                                        <h4 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>Summary</h4>
                                        {renderCleanList(summary)}
                                    </div>
                                )}

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
                                            <p style={{ fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.05em' }}>
                                                {!summary ? 'Generating executive summary...' : 'Generating comprehensive analysis...'}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {structuredAnalysis && (
                                    <>
                                        {structuredAnalysis["Key Insights"] && (
                                            <div className="analysis-section">
                                                <h4>Key Insights</h4>
                                                {renderCleanList(structuredAnalysis["Key Insights"])}
                                            </div>
                                        )}
                                        {structuredAnalysis["Potential Risks"] && (
                                            <div className="analysis-section">
                                                <h4>Potential Risks</h4>
                                                {renderCleanList(structuredAnalysis["Potential Risks"])}
                                            </div>
                                        )}
                                        {structuredAnalysis.Recommendations && (
                                            <div className="analysis-section recommendations">
                                                <h4>Recommendations</h4>
                                                {renderCleanList(structuredAnalysis.Recommendations)}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )}

                        {mode === 'overview' && (
                            <>
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
                                            <p style={{ fontSize: '0.9rem', fontWeight: 500, letterSpacing: '0.05em' }}>Generating executive summary...</p>
                                        </div>
                                    </div>
                                )}
                                {summary && (
                                    <div className="analysis-text animate-fade" style={{ opacity: 0.9 }}>
                                        <h4 style={{ color: 'var(--primary)', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, fontWeight: 700 }}>Summary</h4>
                                        {renderCleanList(summary)}
                                    </div>
                                )}
                            </>
                        )}

                        {!hasInitiated && !loading && !error && (
                            <div className="animate-fade" style={{
                                height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', opacity: 0.8, gap: '0.5rem'
                            }}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <circle cx="12" cy="12" r="6"></circle>
                                    <circle cx="12" cy="12" r="2"></circle>
                                </svg>
                                <p>Click below to analyse the client's risk alignment.</p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setHasInitiated(true); }}
                                    style={{
                                        padding: '10px 24px', borderRadius: '10px',
                                        background: 'linear-gradient(135deg, #C5B358 0%, #B3A049 100%)',
                                        color: '#fff', border: 'none', fontWeight: 700,
                                        fontSize: '0.85rem', cursor: 'pointer',
                                        transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 2px 8px rgba(197, 179, 88, 0.25)',
                                        marginTop: '0.5rem'
                                    }}
                                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                >
                                    Generate Analysis
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {mode === 'overview' && (
                    <AIDisclaimerPill
                        mode={mode}
                        onAIModalOpen={() => setIsAIModalOpen(true)}
                        onFeedbackModalOpen={() => setIsFeedbackModalOpen(true)}
                    />
                )}
            </div>

            {mode === 'focused' && (
                <AIDisclaimerPill
                    mode={mode}
                    onAIModalOpen={() => setIsAIModalOpen(true)}
                    onFeedbackModalOpen={() => setIsFeedbackModalOpen(true)}
                />
            )}

            <RiskLevelInfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
            <AIInfoModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} />
            <AIFeedbackModal
                isOpen={isFeedbackModalOpen}
                onClose={() => setIsFeedbackModalOpen(false)}
                rating={rating}
                setRating={setRating}
                feedbackComment={feedbackComment}
                setFeedbackComment={setFeedbackComment}
                isSubmitting={isSubmittingFeedback}
                submitted={feedbackSubmitted}
                onSubmit={handleFeedbackSubmitLocal}
                error={feedbackError}
            />
        </>
    );
};
