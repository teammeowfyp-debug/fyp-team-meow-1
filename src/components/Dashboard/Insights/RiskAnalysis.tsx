import React, { useState, useEffect } from 'react';
import { generateRiskAnalysis, generateRiskSummary } from '../../../lib/insightsAI';
import { useAIAnalysis } from './useAIAnalysis';
import type { InsightsProps } from './Insights.helpers';
import { supabase } from '../../../lib/supabaseClient';
import {
    RISK_LEVEL_DESCRIPTIONS,
    buildFinancialContextParams,
    applyAiFailure,
    parseInsightsJsonResponse,
} from './Insights.helpers';
import { AiErrorModal } from './AiErrorModal';
import {
    RiskLevelInfoModal,
    AIInfoModal,
    AIFeedbackModal,
    renderCleanList,
    InlineCopyButton,
    AIDisclaimerPill
} from './Insights.components';
import { Button } from '../../UI/Button';

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
        errorCode, setErrorCode,
        clearAiError,
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
    const [forceRegenerate, setForceRegenerate] = useState(false);

    useEffect(() => {
        const isCacheEmpty = !cache || Object.keys(cache).length === 0;
        setHasInitiated(!isCacheEmpty);
    }, [client?.client_id, dateRange?.startDate, dateRange?.endDate]);

    const handleRegenerateNow = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        e?.preventDefault();
        setForceRegenerate(true);
        reset();
        if (onCacheUpdate) {
            onCacheUpdate({
                overview: undefined,
                focused: undefined,
                generatedPeriod: undefined,
            });
        }
        setHasInitiated(true);
    };

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
                clearAiError();
                try {
                    const category = client.risk_profile || 'Level 2';
                    const description = RISK_LEVEL_DESCRIPTIONS[category] || RISK_LEVEL_DESCRIPTIONS['Level 2'];
                    setClientInfo({
                        category,
                        description,
                        date: client.last_updated || new Date().toISOString()
                    });

                    const params = buildFinancialContextParams(client, dateRange);
                    if (!params) {
                        setErrorCode(null);
                        setError('Not enough client data to run analysis for this period. Try adjusting the date range or ensure plans and cashflow exist.');
                        return;
                    }

                    // Try DB cache first (latest for this client + period).
                    if (!forceRegenerate) {
                        try {
                            const { data: cached, error: cacheErr } = await supabase
                                .from('client_ai_analysis')
                                .select('content, created_at')
                                .eq('client_id', client.client_id)
                                .eq('analysis_type', 'risk_summary_normal')
                                .eq('start_date', dateRange?.startDate ?? null)
                                .eq('end_date', dateRange?.endDate ?? null)
                                .order('created_at', { ascending: false })
                                .limit(1)
                                .maybeSingle();

                            if (!cacheErr && cached?.content) {
                                const content: any = cached.content;
                                const exSummary = content?.['Executive Summary'];
                                const text = (typeof exSummary === 'string' && exSummary.trim()) ? exSummary.trim() : JSON.stringify(content);
                                setSummary(text);
                                if (onCacheUpdate) onCacheUpdate({ overview: text, generatedPeriod: dateRange });
                                return;
                            }
                        } catch {
                            // ignore cache read errors, fall back to generating
                        }
                    }

                    const stream = generateRiskSummary(params);
                    let fullText = '';
                    for await (const chunk of stream) {
                        fullText += chunk;
                    }

                    if (!fullText.trim()) {
                        setErrorCode(null);
                        setError('The AI returned an empty response. Please try again.');
                        return;
                    }

                    try {
                        const parsed = JSON.parse(fullText);
                        const exSummary = parsed["Executive Summary"] || fullText;
                        setSummary(exSummary);
                        if (onCacheUpdate) onCacheUpdate({ overview: exSummary, generatedPeriod: dateRange });
                    } catch {
                        setSummary(fullText);
                        if (onCacheUpdate) onCacheUpdate({ overview: fullText, generatedPeriod: dateRange });
                    }
                } catch (err: unknown) {
                    applyAiFailure(err, setError, setErrorCode, 'Failed to load summary.');
                } finally {
                    setForceRegenerate(false);
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
            clearAiError();
            try {
                const params = buildFinancialContextParams(client, dateRange);
                if (!params) {
                    setErrorCode(null);
                    setError('Not enough client data to run analysis for this period. Try adjusting the date range or ensure plans and cashflow exist.');
                    return;
                }

                // Try DB cache first (latest for this client + period).
                if (!forceRegenerate) {
                    try {
                        const { data: cached, error: cacheErr } = await supabase
                            .from('client_ai_analysis')
                            .select('content, created_at')
                            .eq('client_id', client.client_id)
                            .eq('analysis_type', 'risk_analysis_comprehensive')
                            .eq('start_date', dateRange?.startDate ?? null)
                            .eq('end_date', dateRange?.endDate ?? null)
                            .order('created_at', { ascending: false })
                            .limit(1)
                            .maybeSingle();

                        if (!cacheErr && cached?.content) {
                            setStructuredAnalysis(cached.content as any);
                            if (onCacheUpdate) onCacheUpdate({ focused: cached.content, generatedPeriod: dateRange });
                            return;
                        }
                    } catch {
                        // ignore cache read errors, fall back to generating
                    }
                }

                const stream = generateRiskAnalysis(params);
                let fullText = '';
                for await (const chunk of stream) {
                    fullText += chunk;
                }
                const parsed = parseInsightsJsonResponse(fullText);
                if (!parsed.ok) {
                    setErrorCode(null);
                    setError(parsed.message);
                    return;
                }
                setStructuredAnalysis(parsed.value);
                if (onCacheUpdate) onCacheUpdate({ focused: parsed.value, generatedPeriod: dateRange });
            } catch (err: unknown) {
                applyAiFailure(err, setError, setErrorCode, 'Failed to generate full risk analysis.');
            } finally {
                setForceRegenerate(false);
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
            <div
                className="risk-indicator"
                style={{
                    flex: 1,
                    gap: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: 0,
                    marginTop: mode === 'focused' ? '-0.75rem' : 0,
                }}
            >
                {mode === 'focused' && loading && (
                    <p className="insights-run-hint">
                        Stay on this view until loading finishes. Going back or switching tabs cancels this run (we don’t run AI in the background).
                    </p>
                )}
                {clientInfo && (
                    <div className="risk-header-info">
                        <div
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.75rem',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '100%',
                                marginTop: 0,
                            }}
                        >
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
                                        <Button
                                            onClick={() => setIsInfoModalOpen(true)}
                                            size="small"
                                            style={{
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '50%',
                                                padding: 0,
                                                minWidth: '24px',
                                                background: 'rgba(0,0,0,0.06)',
                                                color: 'var(--text-muted)',
                                                border: 'none',
                                                fontSize: '11px',
                                                fontWeight: 'var(--font-semibold)'
                                            }}
                                        >
                                            ?
                                        </Button>
                                    )}
                                </div>
                                <span className="value" style={{
                                    fontSize: mode === 'overview' ? 'var(--text-xl)' : 'var(--text-4xl)',
                                    color: 'var(--accent)',
                                    fontWeight: 'var(--font-bold)'
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
                        {mode === 'focused' && (
                            <div className="structured-analysis">
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
                                            <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-medium)', letterSpacing: '0.05em' }}>
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
                                            <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-medium)', letterSpacing: '0.05em' }}>Generating executive summary...</p>
                                        </div>
                                    </div>
                                )}
                                {summary && (
                                    <div className="analysis-text" style={{ opacity: 0.9 }}>
                                        <h4 style={{ color: 'var(--primary)', fontSize: 'var(--text-xs)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, fontWeight: 'var(--font-semibold)' }}>Summary</h4>
                                        {renderCleanList(summary)}
                                    </div>
                                )}
                            </>
                        )}

                        {!hasInitiated && !loading && !error && (
                            <div style={{
                                height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-base)', opacity: 0.8, gap: '0.5rem'
                            }}>
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                                    <circle cx="12" cy="12" r="10"></circle>
                                    <circle cx="12" cy="12" r="6"></circle>
                                    <circle cx="12" cy="12" r="2"></circle>
                                </svg>
                                <p>Click below to analyse the client's risk alignment.</p>
                                <Button
                                    onClick={(e) => { e.stopPropagation(); setHasInitiated(true); }}
                                    variant="outline"
                                    size={mode === 'focused' ? 'medium' : 'small'}
                                    style={{ marginTop: '0.5rem' }}
                                >
                                    Generate Analysis
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Outdated Analysis Warning Indicator */}
                {cache?.generatedPeriod && dateRange && (cache.generatedPeriod.startDate !== dateRange.startDate || cache.generatedPeriod.endDate !== dateRange.endDate) && (
                    <div className="standard-error-box" style={{ marginTop: '0.25rem'}}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9B2226" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="12"></line>
                            <line x1="12" y1="16" x2="12.01" y2="16"></line>
                        </svg>
                        <span style={{ flex: 1 }}>
                            This analysis was generated for a different period ({new Date(cache.generatedPeriod.startDate).toLocaleDateString()} - {new Date(cache.generatedPeriod.endDate).toLocaleDateString()})
                        </span>
                        <Button
                            onClick={handleRegenerateNow}
                            variant="outline"
                            size={mode === 'focused' ? 'medium' : 'small'}
                            style={{
                                color: '#9B2226',
                                borderColor: 'rgba(155, 34, 38, 0.3)',
                                background: 'transparent',
                                transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e: any) => {
                                e.currentTarget.style.background = 'rgba(155, 34, 38, 0.1)';
                                e.currentTarget.style.color = '#7a1b1e';
                            }}
                            onMouseLeave={(e: any) => {
                                e.currentTarget.style.background = 'transparent';
                                e.currentTarget.style.color = '#9B2226';
                            }}
                        >
                            Regenerate
                        </Button>
                    </div>
                )}

                {mode === 'overview' && (
                    <AIDisclaimerPill
                        mode={mode}
                        onAIModalOpen={() => setIsAIModalOpen(true)}
                        onFeedbackModalOpen={() => setIsFeedbackModalOpen(true)}
                        showRegenerate={hasInitiated && !!summary}
                        regenerateDisabled={loading}
                        onRegenerate={() => handleRegenerateNow()}
                    />
                )}
            </div>

            {mode === 'focused' && (
                <AIDisclaimerPill
                    mode={mode}
                    onAIModalOpen={() => setIsAIModalOpen(true)}
                    onFeedbackModalOpen={() => setIsFeedbackModalOpen(true)}
                    showRegenerate={hasInitiated && (!!summary || !!structuredAnalysis)}
                    regenerateDisabled={loading}
                    onRegenerate={() => handleRegenerateNow()}
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
            <AiErrorModal
                open={!!error}
                onClose={clearAiError}
                message={error}
                code={errorCode}
            />
        </>
    );
};
