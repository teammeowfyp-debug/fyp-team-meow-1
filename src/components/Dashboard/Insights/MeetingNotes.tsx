import React, { useState, useEffect } from 'react';
import { generateMeetingNotes, generateMeetingSummary } from '../../../lib/insightsAI';
import { useAIAnalysis } from './useAIAnalysis';
import type { InsightsProps } from './Insights.helpers';
import { buildFinancialContextParams, applyAiFailure, parseInsightsJsonResponse } from './Insights.helpers';
import { AiErrorModal } from './AiErrorModal';
import {
    AIInfoModal,
    AIFeedbackModal,
    renderCleanList,
    InlineCopyButton,
    AIDisclaimerPill
} from './Insights.components';
import { Button } from '../../UI/Button';

export const MeetingNotes: React.FC<InsightsProps> = ({
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
        summary: meetingNotesSummary, setSummary: setMeetingNotesSummary,
        result: meetingNotesResult, setResult: setMeetingNotesResult,
        copied: meetingNotesCopied, handleCopy,
        rating, setRating,
        feedbackComment, setFeedbackComment,
        isSubmittingFeedback, feedbackSubmitted,
        feedbackError, handleFeedbackSubmit,
        reset
    } = useAIAnalysis(client?.client_id, 'meeting_notes');

    const [transcript, setTranscript] = useState<string>(cache?.meetingNotesTranscript || '');
    const [meetingTab, setMeetingTab] = useState<'transcript' | 'generated'>(cache?.meetingNotesSummary ? 'generated' : 'transcript');
    const [isAIModalOpen, setIsAIModalOpen] = useState<boolean>(false);
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);
    const [meetingOutputHovered, setMeetingOutputHovered] = useState(false);

    useEffect(() => {
        if (!client) return;
        const isCacheEmpty = !cache || Object.keys(cache).length === 0;
        if (isCacheEmpty) {
            reset();
            setTranscript('');
        } else {
            if (cache?.meetingNotesSummary) setMeetingNotesSummary(cache.meetingNotesSummary);
            if (cache?.meetingNotes) setMeetingNotesResult(cache.meetingNotes);
            if (cache?.meetingNotesTranscript) setTranscript(cache.meetingNotesTranscript);
        }
    }, [client, cache]);

    useEffect(() => {
        if (mode !== 'focused') return;
        if (!client || !meetingNotesSummary || meetingNotesResult || loading || !transcript.trim()) return;

        const generateFullNotes = async () => {
            setLoading(true);
            clearAiError();
            try {
                const contextParams = buildFinancialContextParams(client, dateRange);
                if (!contextParams) throw new Error('Could not build financial context.');
                const params = { ...contextParams, transcript: transcript.trim() };
                const stream = generateMeetingNotes(params);
                let fullText = '';
                for await (const chunk of stream) fullText += chunk;
                const parsed = parseInsightsJsonResponse(fullText);
                if (!parsed.ok) {
                    setErrorCode(null);
                    setError(parsed.message);
                    return;
                }
                setMeetingNotesResult(parsed.value);
                if (onCacheUpdate) onCacheUpdate({ meetingNotes: parsed.value });
            } catch (err: unknown) {
                applyAiFailure(err, setError, setErrorCode, 'Failed to generate full meeting notes.');
            } finally {
                setLoading(false);
            }
        };

        generateFullNotes();
    }, [mode, meetingNotesSummary, meetingNotesResult, client]);

    const handleMeetingNotesSubmit = async () => {
        if (!transcript.trim() || !client) return;
        setLoading(true);
        setMeetingTab('generated');
        clearAiError();

        try {
            const contextParams = buildFinancialContextParams(client, dateRange);
            if (!contextParams) throw new Error('Could not build financial context.');
            const params = { ...contextParams, transcript: transcript.trim() };
            const stream = generateMeetingSummary(params);
            let fullText = '';
            for await (const chunk of stream) fullText += chunk;
            if (!fullText.trim()) {
                setErrorCode(null);
                setError('The AI returned an empty response. Please try again.');
                return;
            }
            try {
                const parsed = JSON.parse(fullText);
                const summaryText = parsed["Meeting Summary"] || fullText;
                setMeetingNotesSummary(summaryText);
                if (onCacheUpdate) {
                    onCacheUpdate({ meetingNotesSummary: summaryText, meetingNotesTranscript: transcript.trim() });
                }
            } catch {
                setMeetingNotesSummary(fullText);
                if (onCacheUpdate) {
                    onCacheUpdate({ meetingNotesSummary: fullText, meetingNotesTranscript: transcript.trim() });
                }
            }
        } catch (err: unknown) {
            applyAiFailure(err, setError, setErrorCode, 'Failed to generate meeting notes.');
        } finally {
            setLoading(false);
        }
    };

    const onCopyClicked = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        let textToCopy = 'MEETING NOTES\n\n';
        if (mode === 'overview') {
            if (meetingNotesSummary) textToCopy += `Summary:\n${meetingNotesSummary}`;
        } else {
            if (meetingNotesSummary) textToCopy += `Summary:\n${meetingNotesSummary}`;
            if (meetingNotesResult) {
                if (textToCopy) textToCopy += '\n\n';
                textToCopy += `Key Takeaways:\n${meetingNotesResult["Key Takeaways"]}\n\n` +
                    `Action Items:\n${meetingNotesResult["Action Items"]}\n\n` +
                    `Financial Insights:\n${meetingNotesResult["Financial Insights"]}`;
            }
        }
        handleCopy(textToCopy);
    };

    const handleFeedbackSubmitLocal = () => {
        let meetingContent = '';
        if (meetingNotesSummary) meetingContent += `Meeting Summary:\n${meetingNotesSummary}`;
        if (meetingNotesResult) {
            if (meetingContent) meetingContent += '\n\n';
            meetingContent += `Key Takeaways:\n${meetingNotesResult["Key Takeaways"]}\n\n` +
                `Action Items:\n${meetingNotesResult["Action Items"]}\n\n` +
                `Financial Insights:\n${meetingNotesResult["Financial Insights"]}`;
        }
        handleFeedbackSubmit(meetingContent);
    };

    const handleNewTranscript = () => {
        setMeetingNotesSummary('');
        setMeetingNotesResult(null);
        setTranscript('');
        setMeetingTab('transcript');
        if (onCacheUpdate) onCacheUpdate({ meetingNotes: null, meetingNotesSummary: '', meetingNotesTranscript: '' });
    };

    return (
        <>
            <div className="risk-indicator" style={{ flex: 1, gap: '1rem', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                {mode === 'focused' && loading && (
                    <p className="insights-run-hint">
                        Stay on this view until loading finishes. Going back or switching tabs cancels this run (we don’t run AI in the background).
                    </p>
                )}
                <div className="tabs-switcher" style={{ marginBottom: 0 }}>
                    <Button
                        variant="tab"
                        isActive={meetingTab === 'transcript'}
                        size={mode === 'focused' ? 'medium' : 'small'}
                        style={mode === 'overview' ? { padding: '8px 12px', fontSize: 'var(--text-xs)' } : {}}
                        onClick={(e) => { e.stopPropagation(); setMeetingTab('transcript'); }}
                    >
                        Transcript
                    </Button>
                    <Button
                        variant="tab"
                        isActive={meetingTab === 'generated'}
                        size={mode === 'focused' ? 'medium' : 'small'}
                        style={mode === 'overview' ? { padding: '8px 12px', fontSize: 'var(--text-xs)' } : {}}
                        onClick={(e) => { e.stopPropagation(); setMeetingTab('generated'); }}
                    >
                        Notes
                    </Button>
                </div>

                <div className="ai-analysis-content" style={{ minHeight: 0, flex: 1, position: 'relative' }}
                    onMouseEnter={() => setMeetingOutputHovered(true)}
                    onMouseLeave={() => setMeetingOutputHovered(false)}
                >
                    {meetingTab === 'transcript' && (
                        <div className="meeting-input-container" style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }} onClick={(e) => e.stopPropagation()}>
                            <textarea
                                placeholder="Paste or type your meeting transcript here..."
                                value={transcript}
                                onChange={(e: any) => setTranscript(e.target.value)}
                                readOnly={!!(meetingNotesSummary || loading || meetingNotesResult)}
                                style={{
                                    width: '100%', height: '100%', flex: 1, padding: mode === 'focused' ? '1.25rem' : '1rem',
                                    paddingBottom: (meetingNotesSummary || loading || meetingNotesResult) ? '1rem' : (mode === 'focused' ? '60px' : '50px'),
                                    fontSize: mode === 'focused' ? 'var(--text-base)' : 'var(--text-sm)', fontFamily: 'inherit', resize: 'none', outline: 'none',
                                    border: 'none', background: 'transparent', color: 'var(--text-main)', lineHeight: '1.6', boxSizing: 'border-box',
                                    opacity: (meetingNotesSummary || loading || meetingNotesResult) ? 0.8 : 1
                                }}
                            />
                            {!meetingNotesSummary && !loading && !meetingNotesResult && (
                                <Button
                                    onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleMeetingNotesSubmit(); }}
                                    disabled={!transcript.trim() || loading}
                                    variant="outline"
                                    className="solid"
                                    size={mode === 'focused' ? 'medium' : 'small'}
                                    style={{
                                        position: 'absolute',
                                        bottom: mode === 'focused' ? '16px' : '12px',
                                        right: mode === 'focused' ? '16px' : '12px',
                                        zIndex: 5
                                    }}
                                >
                                    {loading ? 'Analysing...' : 'Analyse'}
                                </Button>
                            )}
                        </div>
                    )}

                    {meetingTab === 'generated' && (
                        <>
                            {(meetingNotesSummary || meetingNotesResult) && (
                                <InlineCopyButton onClick={onCopyClicked} isCopied={meetingNotesCopied} visible={meetingOutputHovered} />
                            )}
                            <div className="ai-analysis-scroll-area">
                                {!meetingNotesSummary && !loading && !meetingNotesResult && (
                                    <div style={{
                                        height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                                        padding: '2rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: 'var(--text-base)', opacity: 0.8, gap: '1rem'
                                    }}>
                                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                                            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                                            <polyline points="14 2 14 8 20 8"></polyline>
                                            <line x1="16" y1="13" x2="8" y2="13"></line>
                                            <line x1="16" y1="17" x2="8" y2="17"></line>
                                            <line x1="10" y1="9" x2="8" y2="9"></line>
                                        </svg>
                                        <p>No meeting notes generated yet. <br />Please submit a transcript to begin.</p>
                                    </div>
                                )}

                                {mode === 'focused' && (meetingNotesSummary || loading || meetingNotesResult) && (
                                    <div className="structured-analysis">
                                        {meetingNotesSummary && (
                                            <div className="analysis-section">
                                                <h4 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>Summary</h4>
                                                {renderCleanList(meetingNotesSummary)}
                                            </div>
                                        )}
                                        {loading && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem 0' }}>
                                                <div className="loading-shimmer">
                                                    <div className="line" style={{ width: '90%' }}></div>
                                                    <div className="line" style={{ width: '100%' }}></div>
                                                    <div className="line short"></div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                                                    <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-medium)', letterSpacing: '0.05em' }}>
                                                        {!meetingNotesSummary ? 'Generating executive summary...' : 'Generating comprehensive analysis...'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {meetingNotesResult && (
                                            <>
                                                {meetingNotesResult["Key Takeaways"] && (
                                                    <div className="analysis-section">
                                                        <h4>Key Takeaways</h4>
                                                        {renderCleanList(meetingNotesResult["Key Takeaways"])}
                                                    </div>
                                                )}
                                                {meetingNotesResult["Action Items"] && (
                                                    <div className="analysis-section">
                                                        <h4>Action Items</h4>
                                                        {renderCleanList(meetingNotesResult["Action Items"])}
                                                    </div>
                                                )}
                                                {meetingNotesResult["Financial Insights"] && (
                                                    <div className="analysis-section recommendations">
                                                        <h4>Financial Insights</h4>
                                                        {renderCleanList(meetingNotesResult["Financial Insights"])}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {mode === 'overview' && (meetingNotesSummary || loading) && (
                                    <div>
                                        {loading && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem 0' }}>
                                                <div className="loading-shimmer">
                                                    <div className="line" style={{ width: '90%' }}></div>
                                                    <div className="line" style={{ width: '100%' }}></div>
                                                    <div className="line short"></div>
                                                </div>
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', color: 'var(--text-muted)' }}>
                                                    <p style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--font-medium)', letterSpacing: '0.05em' }}>Generating executive summary...</p>
                                                </div>
                                            </div>
                                        )}
                                        {meetingNotesSummary && !loading && (
                                            <div className="analysis-text" style={{ opacity: 0.9 }}>
                                                <h4 style={{ color: 'var(--primary)', fontSize: 'var(--text-xs)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, fontWeight: 'var(--font-semibold)' }}>Summary</h4>
                                                {renderCleanList(meetingNotesSummary)}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                </div>

                {mode === 'overview' && (
                    <AIDisclaimerPill
                        mode={mode}
                        onAIModalOpen={() => setIsAIModalOpen(true)}
                        onFeedbackModalOpen={() => setIsFeedbackModalOpen(true)}
                        actionLabel={(meetingNotesSummary || meetingNotesResult) ? 'New transcript' : undefined}
                        actionDisabled={loading}
                        onAction={handleNewTranscript}
                    />
                )}
            </div>

            {mode === 'focused' && (
                <AIDisclaimerPill
                    mode={mode}
                    onAIModalOpen={() => setIsAIModalOpen(true)}
                    onFeedbackModalOpen={() => setIsFeedbackModalOpen(true)}
                    actionLabel={(meetingNotesSummary || meetingNotesResult) ? 'New transcript' : undefined}
                    actionDisabled={loading}
                    onAction={handleNewTranscript}
                />
            )}

            <AIInfoModal isOpen={isAIModalOpen} onClose={() => setIsAIModalOpen(false)} isMeetingNotes={true} />
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
