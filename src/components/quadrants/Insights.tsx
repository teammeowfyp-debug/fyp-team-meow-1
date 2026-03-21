import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { generateRiskAnalysis, generateRiskSummary, generateMeetingNotes, generateMeetingSummary, submitAIFeedback } from '../../lib/insightsAI';

interface InsightsProps {
    clientId?: string;
    client?: any;
    mode?: 'overview' | 'focused';
    dateRange?: { startDate: string; endDate: string };
    cache?: { overview?: string; focused?: any; meetingNotes?: any; meetingNotesSummary?: string; meetingNotesTranscript?: string } | null;
    onCacheUpdate?: (update: { overview?: string; focused?: any; meetingNotes?: any; meetingNotesSummary?: string; meetingNotesTranscript?: string }) => void;
    insightsMode?: 'risk-analysis' | 'meeting-notes';
    onInsightsModeChange?: (mode: 'risk-analysis' | 'meeting-notes') => void;
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
            zIndex: 1000
        }}>
            <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()} style={{
                background: '#fff', borderRadius: '24px', boxShadow: 'var(--shadow-xl)',
                position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', fontSize: '1.75rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                >&times;</button>

                <div className="modal-header" style={{ padding: '2rem 2rem 0rem 2rem' }}>
                    <h2 style={{ fontSize: '1.5rem', color: 'var(--secondary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>Risk Level Guide</h2>
                </div>

                <div className="modal-body">
                    {Object.entries(RISK_LEVEL_DESCRIPTIONS).map(([level, desc]) => (
                        <div key={level}>
                            <h4 style={{ color: 'var(--primary)', fontSize: '1rem', display: 'flex', alignItems: 'center', marginTop: '1.5rem', marginBottom: '4px' }}>
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

const AIInfoModal: React.FC<{ isOpen: boolean; onClose: () => void; isMeetingNotes?: boolean }> = ({ isOpen, onClose, isMeetingNotes }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()} style={{
                background: '#fff', borderRadius: '24px', boxShadow: 'var(--shadow-xl)',
                position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', fontSize: '1.75rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                >&times;</button>

                <div className="modal-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                        <h2 style={{ fontSize: '1.5rem', color: 'var(--secondary)', margin: 0 }}>
                            How Does AI Generate This Analysis?
                        </h2>
                    </div>
                </div>

                <div className="modal-body">
                    <section style={{ marginBottom: '1.5rem' }}>
                        <p style={{ fontSize: '0.9rem', color: 'var(--secondary)', lineHeight: '1.5', opacity: 0.85, marginBottom: '1rem' }}>
                            {isMeetingNotes
                                ? "Our AI cross-references meeting transcripts with client financial data to deliver five key functions:"
                                : "Our AI synthesizes client financial data across five core analytical pillars to identify misalignments:"}
                        </p>
                        <div style={{ padding: '0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <p style={{ fontSize: '0.85rem', color: 'var(--secondary)', lineHeight: '1.6', margin: 0 }}>
                                <strong style={{ color: 'var(--primary)', fontWeight: 700, marginRight: '6px' }}>{isMeetingNotes ? 'Conversation Synthesis:' : 'Temporal Context:'}</strong>
                                <span style={{ opacity: 0.85 }}>{isMeetingNotes ? 'Distills lengthy meeting transcripts into a concise, high-level executive summary.' : 'References valuations and cashflows precisely based on the selected analysis period.'}</span>
                            </p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--secondary)', lineHeight: '1.6', margin: 0 }}>
                                <strong style={{ color: 'var(--primary)', fontWeight: 700, marginRight: '6px' }}>{isMeetingNotes ? 'Key Takeaway Extraction:' : 'Allocation Alignment:'}</strong>
                                <span style={{ opacity: 0.85 }}>{isMeetingNotes ? 'Identifies the most critical decisions and salient points made during the client interaction.' : 'Checks if the volatility of the current portfolio matches the desired risk levels.'}</span>
                            </p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--secondary)', lineHeight: '1.6', margin: 0 }}>
                                <strong style={{ color: 'var(--primary)', fontWeight: 700, marginRight: '6px' }}>{isMeetingNotes ? 'Action Item Tracking:' : 'Risk Capacity:'}</strong>
                                <span style={{ opacity: 0.85 }}>{isMeetingNotes ? 'Automatically generates a structured list of follow-up tasks and next steps discussed in the meeting.' : 'Determines if there is sufficient liquidity to support the risk suggested by their profile.'}</span>
                            </p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--secondary)', lineHeight: '1.6', margin: 0 }}>
                                <strong style={{ color: 'var(--primary)', fontWeight: 700, marginRight: '6px' }}>{isMeetingNotes ? 'Financial Integration:' : 'Structural Integrity:'}</strong>
                                <span style={{ opacity: 0.85 }}>{isMeetingNotes ? 'Connects transcript details with the client\'s actual portfolio data to provide deeper financial context.' : 'Identifies conflicts between illiquid assets, plan overlaps, or insurance coverage holes.'}</span>
                            </p>
                            <p style={{ fontSize: '0.85rem', color: 'var(--secondary)', lineHeight: '1.6', margin: 0 }}>
                                <strong style={{ color: 'var(--primary)', fontWeight: 700, marginRight: '6px' }}>{isMeetingNotes ? 'Strategic Alignment:' : 'Gap Synthesis:'}</strong>
                                <span style={{ opacity: 0.85 }}>{isMeetingNotes ? 'Evaluates how the meeting\'s discussion aligns with the client\'s target goals and risk profile.' : 'Pinpoints the specific delta between the client\'s current reality and their target goals.'}</span>
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

const AIFeedbackModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    rating: boolean | null;
    setRating: (rating: boolean | null) => void;
    feedbackComment: string;
    setFeedbackComment: (comment: string) => void;
    isSubmitting: boolean;
    submitted: boolean;
    onSubmit: () => void;
    error: string | null;
    isMeetingNotes?: boolean;
}> = ({ isOpen, onClose, rating, setRating, feedbackComment, setFeedbackComment, isSubmitting, submitted, onSubmit, error, isMeetingNotes }) => {
    if (!isOpen) return null;

    return createPortal(
        <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1000 }}>
            <div className="modal-content modal-sm" onClick={(e) => e.stopPropagation()} style={{
                background: '#fff', borderRadius: '24px', boxShadow: 'var(--shadow-xl)',
                position: 'relative'
            }}>
                <button
                    onClick={onClose}
                    style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', fontSize: '1.75rem', cursor: 'pointer', color: 'var(--text-muted)' }}
                >&times;</button>

                <div className="modal-header">
                    <h2 style={{ fontSize: '1.5rem', color: 'var(--secondary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>Was This Analysis Helpful?</h2>
                </div>

                <div className="modal-body">
                    <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '0rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                        Your feedback helps us improve the relevance and accuracy of our AI-powered features.
                    </p>

                    {!submitted ? (
                        <>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                                <button
                                    onClick={() => setRating(true)}
                                    style={{
                                        background: rating === true ? 'rgba(113, 146, 102, 0.15)' : 'rgba(0,0,0,0.02)',
                                        border: `1px solid ${rating === true ? 'var(--success)' : 'var(--border)'}`,
                                        borderRadius: '12px',
                                        padding: '16px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: rating === true ? 'var(--success)' : 'var(--text-muted)'
                                    }}
                                >
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill={rating === true ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M7 10v12"></path>
                                        <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z"></path>
                                    </svg>
                                </button>
                                <button
                                    onClick={() => setRating(false)}
                                    style={{
                                        background: rating === false ? 'rgba(155, 34, 38, 0.1)' : 'rgba(0,0,0,0.02)',
                                        border: `1px solid ${rating === false ? '#9B2226' : 'var(--border)'}`,
                                        borderRadius: '12px',
                                        padding: '16px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s',
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: rating === false ? '#9B2226' : 'var(--text-muted)'
                                    }}
                                >
                                    <svg width="28" height="28" viewBox="0 0 24 24" fill={rating === false ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17 14V2"></path>
                                        <path d="M9 18.12 10 14H4.17a2 2 0 0 1-1.92-2.56l2.33-8A2 2 0 0 1 6.5 2h13.5a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-2.76a2 2 0 0 0-1.79 1.11L12 22h0a3.13 3.13 0 0 1-3-3.88Z"></path>
                                    </svg>
                                </button>
                            </div>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                                <textarea
                                    placeholder="Optional: How can we improve this result?"
                                    value={feedbackComment}
                                    onChange={(e) => setFeedbackComment(e.target.value)}
                                    style={{
                                        width: '100%',
                                        minHeight: '100px',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        border: '1px solid var(--border)',
                                        fontSize: '0.85rem',
                                        fontFamily: 'inherit',
                                        resize: 'none',
                                        outline: 'none',
                                        boxSizing: 'border-box'
                                    }}
                                />

                                {error && (
                                    <p style={{ color: 'var(--danger)', fontSize: '0.8rem', fontWeight: 500, textAlign: 'center', margin: 0 }}>
                                        {error}
                                    </p>
                                )}

                                <button
                                    onClick={onSubmit}
                                    disabled={isSubmitting || rating === null}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        background: 'var(--primary)',
                                        color: '#fff',
                                        border: 'none',
                                        fontWeight: 600,
                                        fontSize: '0.9rem',
                                        cursor: (isSubmitting || rating === null) ? 'not-allowed' : 'pointer',
                                        opacity: (isSubmitting || rating === null) ? 0.7 : 1,
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div style={{
                            textAlign: 'center',
                            minHeight: '235px',
                            background: 'var(--primary-glow)',
                            border: '1px solid rgba(197, 179, 88, 0.15)',
                            borderRadius: '16px',
                            color: 'var(--primary)',
                            fontWeight: 600,
                            fontSize: '1.5rem',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            Thank you for your feedback!
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

const Insights: React.FC<InsightsProps> = ({
    client,
    mode = 'overview',
    dateRange,
    cache,
    onCacheUpdate,
    insightsMode = 'risk-analysis',
    onInsightsModeChange
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
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState<boolean>(false);

    // Dropdown state for Insights mode
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const [structuredAnalysis, setStructuredAnalysis] = useState<{
        "Key Insights": string;
        "Potential Risks": string;
        "Recommendations": string;
    } | null>(cache?.focused || null);
    const [copied, setCopied] = useState<boolean>(false);

    // AI Feedback State
    const [rating, setRating] = useState<boolean | null>(null);
    const [feedbackComment, setFeedbackComment] = useState<string>('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
    const [feedbackError, setFeedbackError] = useState<string | null>(null);

    // Meeting Notes State
    const [transcript, setTranscript] = useState<string>(cache?.meetingNotesTranscript || '');
    const [meetingNotesLoading, setMeetingNotesLoading] = useState<boolean>(false);
    const [meetingNotesError, setMeetingNotesError] = useState<string | null>(null);
    const [meetingNotesSummary, setMeetingNotesSummary] = useState<string>(cache?.meetingNotesSummary || '');
    const [meetingNotesResult, setMeetingNotesResult] = useState<{
        "Key Takeaways"?: string;
        "Action Items"?: string;
        "Financial Insights"?: string;
    } | null>(cache?.meetingNotes || null);


    const [meetingNotesCopied, setMeetingNotesCopied] = useState<boolean>(false);
    const [meetingTab, setMeetingTab] = useState<'transcript' | 'generated'>(cache?.meetingNotesSummary ? 'generated' : 'transcript');

    const insightsTabButtonStyle = (isActive: boolean) => ({
        flex: 1,
        padding: mode === 'focused' ? '0.5rem 1.5rem' : '0.35rem 1rem',
        border: 'none',
        background: isActive ? 'var(--primary)' : 'transparent',
        color: isActive ? '#fff' : 'var(--text-muted)',
        borderRadius: '8px',
        fontWeight: 600,
        fontSize: mode === 'focused' ? '0.85rem' : '0.75rem',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
        textAlign: 'center' as const
    });

    const handleFeedbackSubmit = async () => {
        if (!client || rating === null) return;
        setIsSubmittingFeedback(true);
        setFeedbackError(null);
        try {
            const isMeeting = insightsMode === 'meeting-notes';
            let meetingContent = '';
            if (isMeeting) {
                if (meetingNotesSummary) meetingContent += `Meeting Summary:\n${meetingNotesSummary}`;
                if (meetingNotesResult) {
                    if (meetingContent) meetingContent += '\n\n';
                    meetingContent += `Key Takeaways:\n${meetingNotesResult["Key Takeaways"]}\n\n` +
                        `Action Items:\n${meetingNotesResult["Action Items"]}\n\n` +
                        `Financial Insights:\n${meetingNotesResult["Financial Insights"]}`;
                }
            }
            const formattedContent = isMeeting
                ? meetingContent
                : (structuredAnalysis
                    ? `Key Insights:\n${structuredAnalysis["Key Insights"]}\n\n` +
                    `Potential Risks:\n${structuredAnalysis["Potential Risks"]}\n\n` +
                    `Recommendations:\n${structuredAnalysis["Recommendations"]}`
                    : '');

            await submitAIFeedback({
                client_id: client.client_id,
                rating,
                comment: feedbackComment || undefined,
                generated_content: formattedContent,
                ai_type: isMeeting ? 'meeting_notes' : 'risk_analysis'
            });
            setFeedbackSubmitted(true);
        } catch (err: any) {
            console.error('Feedback submission failed:', err);
            const errMsg = err.message === 'Load failed' || err.message === 'Failed to fetch'
                ? 'AI Service is currently unreachable. Please check your connection or try again later.'
                : (err.message || 'Failed to submit feedback. Please try again.');
            setFeedbackError(errMsg);
        } finally {
            setIsSubmittingFeedback(false);
        }
    };

    const handleCloseFeedbackModal = () => {
        setIsFeedbackModalOpen(false);
        // Small delay to reset state after modal animation starts closing
        setTimeout(() => {
            setRating(null);
            setFeedbackComment('');
            setFeedbackSubmitted(false);
            setFeedbackError(null);
        }, 200);
    };

    const aiDisclaimerPill = mode === 'focused' ? (
        <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            padding: '1.5rem 0 0.5rem 0',
            marginTop: 'auto'
        }}>
            <button
                onClick={() => setIsAIModalOpen(true)}
                style={{
                    fontSize: '0.65rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(0, 0, 0, 0.03)',
                    padding: '6px 14px',
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
                    e.currentTarget.style.background = 'var(--primary-glow)';
                    e.currentTarget.style.color = 'var(--primary)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)';
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                }}
            >
                How Does AI Generate This Analysis?
            </button>

            <button
                onClick={() => setIsFeedbackModalOpen(true)}
                style={{
                    fontSize: '0.65rem',
                    color: 'var(--text-muted)',
                    background: 'rgba(0, 0, 0, 0.03)',
                    padding: '6px 14px',
                    borderRadius: '20px',
                    border: '1px solid var(--border)',
                    fontWeight: 700,
                    letterSpacing: '0.05em',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    textTransform: 'uppercase',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    marginLeft: 'auto'
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.background = 'var(--primary-glow)';
                    e.currentTarget.style.color = 'var(--primary)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.03)';
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                }}
            >
                Provide Feedback
            </button>
        </div>
    ) : (
        <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: 0,
            marginTop: 'auto',
            marginBottom: '-0.5rem'
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
                    cursor: 'pointer'
                }}
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--primary)" style={{ opacity: 0.9 }}>
                    <path d="M12 2L14.5 9.5L22 12L14.5 14.5L12 22L9.5 14.5L2 12L9.5 9.5L12 2Z" />
                </svg>
                This analysis is generated by AI
            </button>
        </div>
    );

    useEffect(() => {
        if (!client) return;

        // Reset feedback state on client/mode/date switch
        setRating(null);
        setFeedbackComment('');
        setFeedbackSubmitted(false);
        setFeedbackError(null);

        // Reset local states if cache is null or we're in a new date context (empty object)
        const isCacheEmpty = !cache || Object.keys(cache).length === 0;
        if (isCacheEmpty) {
            setSummary('');
            setStructuredAnalysis(null);
            setMeetingNotesSummary('');
            setMeetingNotesResult(null);
            setTranscript('');
            setError(null);
        }

        if (insightsMode !== 'risk-analysis') return;

        const fetchSummary = async () => {
            // 1. Check if already cached
            if (cache?.overview) {
                setSummary(cache.overview);
                setClientInfo({
                    category: client.risk_profile || 'Level 2',
                    description: RISK_LEVEL_DESCRIPTIONS[client.risk_profile] || RISK_LEVEL_DESCRIPTIONS['Level 2'],
                    date: client.last_updated || new Date().toISOString()
                });
            }
            if (cache?.focused) {
                setStructuredAnalysis(cache.focused);
            }

            // 2. If no summary exists (even in state), generate it
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

                    const params = buildFinancialContextParams();
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
                } catch (err: any) {
                    console.error('Risk Summary Error:', err);
                    setError(err.message === 'Load failed' || err.message === 'Failed to fetch' ? 'AI Service unreachable.' : 'Failed to load summary.');
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchSummary();
    }, [client, dateRange?.endDate, cache, insightsMode]);

    // Auto-generate full risk analysis when entering focused mode with a summary but no full analysis
    // (Matches meeting notes sequential loading behavior)
    useEffect(() => {
        if (insightsMode !== 'risk-analysis') return;
        if (mode !== 'focused') return;
        if (!client) return;
        if (!summary) return; // Wait for summary first
        if (structuredAnalysis) return; // Already have it
        if (loading) return; // Wait if already loading something

        const generateFullAnalysis = async () => {
            setLoading(true);
            setError(null);

            try {
                const params = buildFinancialContextParams();
                const stream = generateRiskAnalysis(params);
                let fullText = '';
                for await (const chunk of stream) {
                    fullText += chunk;
                }

                const parsed = JSON.parse(fullText);
                setStructuredAnalysis(parsed);
                if (onCacheUpdate) {
                    onCacheUpdate({ focused: parsed });
                }
            } catch (err: any) {
                console.error('Full Risk Analysis Error:', err);
                setError('Failed to generate full risk analysis.');
            } finally {
                setLoading(false);
            }
        };

        generateFullAnalysis();
    }, [mode, insightsMode, summary, structuredAnalysis, client]);




    const handleCopy = (e: React.MouseEvent) => {
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

        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    // Helper to build client financial context params (reused by both features)
    // Helper to build client financial context params (reused by both features)
    const buildFinancialContextParams = () => {
        const referenceDate = dateRange?.endDate ? new Date(dateRange.endDate) : new Date();
        const oneYearBeforeRef = new Date(referenceDate);
        oneYearBeforeRef.setFullYear(oneYearBeforeRef.getFullYear() - 1);

        const category = client?.risk_profile || 'Level 2';
        const description = RISK_LEVEL_DESCRIPTIONS[category] || RISK_LEVEL_DESCRIPTIONS['Level 2'];

        const activePlans = (client?.client_plans || []).filter((p: any) => {
            if (p.status !== 'Active') return false;
            const startDate = p.start_date ? new Date(p.start_date) : null;
            const endDate = (p.end_date || p.expiry_date) ? new Date(p.end_date || p.expiry_date) : null;
            if (startDate && startDate > referenceDate) return false;
            if (endDate && endDate < referenceDate) return false;
            return true;
        });

        const allocationMap: Record<string, number> = {};
        let totalAssetValue = 0;
        let totalSumAssured = 0;
        let earliestStart: Date | null = null;
        let latestEnd: Date | null = null;
        const activeCategories = new Set<string>();

        activePlans.forEach((plan: any) => {
            const isInsurance = plan.asset_class?.includes('Insurance') || plan.sum_assured !== undefined;
            const valuations = isInsurance ? (plan.insurance_valuations || []) : (plan.investment_valuations || []);
            const valueKey = isInsurance ? 'cash_value' : 'market_value';
            const cat = plan.asset_class || plan.policy_type || 'Other';
            if (cat) activeCategories.add(cat);

            if (plan.start_date) {
                const d = new Date(plan.start_date);
                if (!earliestStart || d < earliestStart) earliestStart = d;
            }
            const endDateStr = plan.end_date || plan.expiry_date;
            if (endDateStr) {
                const d = new Date(endDateStr);
                if (!latestEnd || d > latestEnd) latestEnd = d;
            }

            const valuationsAtRef = valuations?.filter((v: any) =>
                new Date(v.as_of_date) <= referenceDate
            ).sort((a: any, b: any) =>
                new Date(b.as_of_date).getTime() - new Date(a.as_of_date).getTime()
            );

            const latestVal = valuationsAtRef[0];
            if (latestVal) {
                const val = parseFloat(latestVal[valueKey] || 0);
                if (val > 0) {
                    totalAssetValue += val;
                    allocationMap[cat] = (allocationMap[cat] || 0) + val;
                }
            }
            if (isInsurance && plan.sum_assured) {
                totalSumAssured += parseFloat(plan.sum_assured);
            }
        });

        // Historical Performance Calculation
        let portfolioPerformanceString = '';
        const activeInvestments = activePlans.filter((p: any) => !p.asset_class?.includes('Insurance') && p.market_value !== undefined);
        if (activeInvestments.length > 0) {
            let pastTotalValue = 0;
            let hasPastData = false;

            activeInvestments.forEach((plan: any) => {
                const valuations = plan.investment_valuations || [];
                const valuationsAtRef = valuations?.filter((v: any) =>
                    new Date(v.as_of_date) <= referenceDate
                ).sort((a: any, b: any) =>
                    new Date(b.as_of_date).getTime() - new Date(a.as_of_date).getTime()
                );

                if (valuationsAtRef.length > 1) {
                    const sortedVals = valuationsAtRef;
                    const latestVal = parseFloat(sortedVals[0].market_value || 0);
                    let pastValRecord = sortedVals.find((v: any) => new Date(v.as_of_date) <= oneYearBeforeRef);
                    if (!pastValRecord && sortedVals.length > 0) {
                        pastValRecord = sortedVals[sortedVals.length - 1];
                    }
                    if (pastValRecord && sortedVals[0].as_of_date !== pastValRecord.as_of_date) {
                        pastTotalValue += parseFloat(pastValRecord.market_value || 0);
                        hasPastData = true;
                    } else {
                        pastTotalValue += latestVal;
                    }
                } else if (valuationsAtRef.length === 1) {
                    pastTotalValue += parseFloat(valuationsAtRef[0].market_value || 0);
                }
            });

            if (hasPastData && pastTotalValue > 0) {
                const diff = totalAssetValue - pastTotalValue;
                const percentChange = ((diff / pastTotalValue) * 100).toFixed(1);
                portfolioPerformanceString = `\n                       - Portfolio Value Change (Last 12 Months from Ref): ${diff >= 0 ? '+' : ''}${percentChange}%`;
            }
        }

        const allocationString = totalAssetValue > 0
            ? Object.entries(allocationMap)
                .filter(([_, val]) => val > 0)
                .map(([cat, val]) => `${Math.round((val / totalAssetValue) * 100)}% ${cat}`)
                .join(', ')
            : 'No allocation data';

        const cashflowsAtRef = (client?.cashflow || [])
            .filter((cf: any) => new Date(cf.as_of_date) <= referenceDate)
            .sort((a: any, b: any) =>
                new Date(b.as_of_date).getTime() - new Date(a.as_of_date).getTime()
            );

        // Cashflow Trends Calculation
        let historicalTrend = '';
        const recentCashflows = cashflowsAtRef.filter((cf: any) => new Date(cf.as_of_date) >= oneYearBeforeRef);
        if (recentCashflows.length > 1) {
            const avgSurplus = recentCashflows.reduce((sum: number, cf: any) => sum + (parseFloat(cf.net_surplus) || 0), 0) / recentCashflows.length;
            const avgInflow = recentCashflows.reduce((sum: number, cf: any) => sum + (parseFloat(cf.total_inflow) || 0), 0) / recentCashflows.length;
            
            let surplusVolatilityInfo = '';
            if (recentCashflows.length >= 3) {
                const surpluses = recentCashflows.map((cf: any) => parseFloat(cf.net_surplus) || 0);
                const variance = surpluses.reduce((sum: number, val: number) => sum + Math.pow(val - avgSurplus, 2), 0) / surpluses.length;
                const stdDev = Math.sqrt(variance);
                const stdDevPercent = avgSurplus !== 0 ? ((stdDev / Math.abs(avgSurplus)) * 100).toFixed(1) : '0';
                surplusVolatilityInfo = `, Net Surplus Std Dev: ${stdDevPercent}%`;
            }
            historicalTrend = `\n                       - Last 12 Months Average: Total Inflow ($${Math.round(avgInflow)}), Net Surplus ($${Math.round(avgSurplus)})${surplusVolatilityInfo}`;
        }

        const latestCashflow = cashflowsAtRef[0];
        const cashflowString = latestCashflow
            ? `Current Cashflow Summary (at Ref Date):
                   - Income: Employment ($${latestCashflow.employment_income_gross}), Rental ($${latestCashflow.rental_income}), Investment ($${latestCashflow.investment_income}). Total Inflow: $${latestCashflow.total_inflow}
                   - Expense: Household ($${latestCashflow.household_expenses}), Tax ($${latestCashflow.income_tax}), Insurance ($${latestCashflow.insurance_premiums}), Property ($${latestCashflow.property_expenses}), Debt/Loan ($${latestCashflow.property_loan_repayment + latestCashflow.non_property_loan_repayment}). Total Expense: $${latestCashflow.total_expense}
                   - Net State: Net Surplus ($${latestCashflow.net_surplus}), Net Cashflow ($${latestCashflow.net_cashflow}).${historicalTrend}`
            : 'No cashflow data';

        const plansString = activePlans.length > 0
            ? `Current Portfolio Summary (at Ref Date):
                   - Total Assets: $${Math.round(totalAssetValue).toLocaleString()}
                   - Total Insurance Sum Assured: $${Math.round(totalSumAssured).toLocaleString()}
                   - Holding Period: ${earliestStart ? (earliestStart as Date).toLocaleDateString() : 'Unknown'} to ${latestEnd ? (latestEnd as Date).toLocaleDateString() : 'Ongoing'}
                   - Plan Distribution: ${Array.from(activeCategories).join(', ')}${portfolioPerformanceString}`
            : 'No active plans';

        return {
            riskProfileDescription: description,
            assetAllocation: allocationString,
            cashflow: cashflowString,
            plansHeld: plansString,
        };
    };


    const handleMeetingNotesSubmit = async () => {
        if (!transcript.trim() || !client) return;
        setMeetingNotesLoading(true);
        setMeetingTab('generated');
        setMeetingNotesError(null);

        try {
            const contextParams = buildFinancialContextParams();
            if (!contextParams) throw new Error('Could not build financial context.');

            const params = {
                ...contextParams,
                transcript: transcript.trim(),
            };

            // Always generate summary first (just like risk analysis overview)
            const stream = generateMeetingSummary(params);
            let fullText = '';
            for await (const chunk of stream) {
                fullText += chunk;
            }

            const parsed = JSON.parse(fullText);
            const summaryText = parsed["Meeting Summary"] || fullText;
            setMeetingNotesSummary(summaryText);
            if (onCacheUpdate) {
                onCacheUpdate({ meetingNotesSummary: summaryText, meetingNotesTranscript: transcript.trim() });
            }
        } catch (err: any) {
            console.error('Meeting Notes Error:', err);
            const errMsg = err.message === 'Load failed' || err.message === 'Failed to fetch'
                ? 'AI Service unreachable.'
                : 'Failed to generate meeting notes.';
            setMeetingNotesError(errMsg);
        } finally {
            setMeetingNotesLoading(false);
        }
    };

    // Auto-generate full meeting notes when entering focused mode with a summary but no full notes
    // (mirrors how risk analysis auto-generates the full analysis in focused mode)
    useEffect(() => {
        if (insightsMode !== 'meeting-notes') return;
        if (mode !== 'focused') return;
        if (!client) return;
        if (!meetingNotesSummary) return; // No summary yet — nothing to expand
        if (meetingNotesResult) return;   // Already have full notes
        if (meetingNotesLoading) return;  // Already in progress
        if (!transcript.trim()) return;   // No transcript to work with

        const generateFullNotes = async () => {
            setMeetingNotesLoading(true);
            setMeetingNotesError(null);

            try {
                const contextParams = buildFinancialContextParams();
                if (!contextParams) throw new Error('Could not build financial context.');

                const params = {
                    ...contextParams,
                    transcript: transcript.trim(),
                };

                const stream = generateMeetingNotes(params);
                let fullText = '';
                for await (const chunk of stream) {
                    fullText += chunk;
                }

                const parsed = JSON.parse(fullText);
                setMeetingNotesResult(parsed);
                if (onCacheUpdate) {
                    onCacheUpdate({ meetingNotes: parsed });
                }
            } catch (err: any) {
                console.error('Meeting Notes Full Error:', err);
                const errMsg = err.message === 'Load failed' || err.message === 'Failed to fetch'
                    ? 'AI Service unreachable.'
                    : 'Failed to generate full meeting notes.';
                setMeetingNotesError(errMsg);
            } finally {
                setMeetingNotesLoading(false);
            }
        };

        generateFullNotes();
    }, [mode, insightsMode, meetingNotesSummary, meetingNotesResult, client]);

    const handleMeetingNotesCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        let textToCopy = 'MEETING NOTES\n\n';
        if (mode === 'overview') {
            if (meetingNotesSummary) textToCopy += `Summary:\n${meetingNotesSummary}`;
        } else {
            // Focused mode (or other) - include everything
            if (meetingNotesSummary) {
            textToCopy += `Summary:\n${meetingNotesSummary}`;
            }
            if (meetingNotesResult) {
                if (textToCopy) textToCopy += '\n\n';
                textToCopy += `Key Takeaways:\n${meetingNotesResult["Key Takeaways"]}\n\n` +
                    `Action Items:\n${meetingNotesResult["Action Items"]}\n\n` +
                    `Financial Insights:\n${meetingNotesResult["Financial Insights"]}`;
            }
        }
        if (!textToCopy) return;

        navigator.clipboard.writeText(textToCopy).then(() => {
            setMeetingNotesCopied(true);
            setTimeout(() => setMeetingNotesCopied(false), 2000);
        });
    };

    // Hover state for showing copy buttons inside output boxes
    const [riskOutputHovered, setRiskOutputHovered] = useState(false);
    const [meetingOutputHovered, setMeetingOutputHovered] = useState(false);

    const renderCleanList = (content: string) => {
        if (!content) return null;
        // Split by newline and filter out empty lines or lines that are just numbers/dashes (legacy cleanup)
        const lines = content.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .map(line => line.replace(/^[\d.)\s•\-*→]+/, '').trim()); // Additional safety for legacy cleaning

        return (
            <ul style={{
                listStylePosition: 'outside',
                paddingLeft: '1rem',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {lines.map((item, idx) => (
                    <li key={idx} style={{
                        fontSize: '0.95rem',
                        lineHeight: '1.6',
                        color: 'var(--text-main)',
                        paddingLeft: '0.2rem'
                    }}>
                        {item}
                    </li>
                ))}
            </ul>
        );
    };

    // Reusable inline copy button component
    const InlineCopyButton: React.FC<{ onClick: (e: React.MouseEvent) => void; isCopied: boolean; visible: boolean }> = ({ onClick, isCopied, visible }) => (
        <button
            onClick={onClick}
            style={{
                position: 'absolute',
                top: '8px',
                right: '8px',
                background: isCopied ? 'var(--success)' : 'var(--primary)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '4px 8px',
                borderRadius: '6px',
                transition: 'all 0.2s ease',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                border: isCopied ? '1px solid var(--success)' : '1px solid var(--primary)',
                opacity: visible || isCopied ? 1 : 0,
                pointerEvents: visible || isCopied ? 'auto' : 'none',
                zIndex: 5,
                boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
            }}
            title="Copy to clipboard"
        >
            {isCopied ? (
                <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Copied</span>
                </>
            ) : (
                <>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                    <span>Copy</span>
                </>
            )}
        </button>
    );

    return (
        <section className="glass-card quadrant">
            <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3>Insights</h3>
                <div className="custom-select-wrapper" ref={dropdownRef} style={{ width: '150px' }}>
                    <div
                        className={`custom-select-trigger ${isDropdownOpen ? 'open' : ''}`}
                        onClick={(e) => { e.stopPropagation(); e.preventDefault(); e.nativeEvent.stopImmediatePropagation(); setIsDropdownOpen(!isDropdownOpen); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onMouseUp={(e) => e.stopPropagation()}
                        style={{
                            padding: '4px 10px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'rgba(0,0,0,0.02)',
                            minHeight: 'auto'
                        }}
                    >
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', letterSpacing: '0.01em' }}>
                            {insightsMode === 'risk-analysis' ? 'Risk Analysis' : 'Meeting Notes'}
                        </span>
                        <svg className="chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '12px', height: '12px' }}>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                        </svg>
                    </div>
                    {isDropdownOpen && (
                        <div className="custom-select-options glass-card" style={{ marginTop: '4px', padding: '4px' }}>
                            <div
                                className={`custom-select-option ${insightsMode === 'risk-analysis' ? 'selected' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onInsightsModeChange?.('risk-analysis');
                                    setIsDropdownOpen(false);
                                }}
                                style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                            >
                                Risk Analysis
                            </div>
                            <div
                                className={`custom-select-option ${insightsMode === 'meeting-notes' ? 'selected' : ''}`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    onInsightsModeChange?.('meeting-notes');
                                    setIsDropdownOpen(false);
                                }}
                                style={{ fontSize: '0.8rem', padding: '8px 12px' }}
                            >
                                Meeting Notes
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ==================== RISK ANALYSIS MODE ==================== */}
            {insightsMode === 'risk-analysis' && (
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
                                <InlineCopyButton onClick={handleCopy} isCopied={copied} visible={riskOutputHovered} />
                            )}
                            <div className="ai-analysis-scroll-area">
                                {/* Focused mode content */}
                                {mode === 'focused' && (
                                    <div className="structured-analysis animate-fade">
                                        {/* 1. Summary always at the top */}
                                        {summary && (
                                            <div className="analysis-section">
                                                <h4 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>Summary</h4>
                                                {renderCleanList(summary)}
                                            </div>
                                        )}

                                        {/* 2. Loading state below summary if still generating details */}
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

                                        {/* 3. Detailed analysis below summary (and shimmer) */}
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

                                {/* Overview mode content */}
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

                                {!loading && !structuredAnalysis && !summary && !error && (
                                    <p className="risk-description">
                                        Select a client to see detailed risk alignment analysis.
                                    </p>
                                )}
                            </div>
                        </div>

                        {mode === 'overview' && aiDisclaimerPill}
                    </div>

                    {mode === 'focused' && aiDisclaimerPill}
                </>
            )}

            {/* ==================== MEETING NOTES MODE ==================== */}
            {insightsMode === 'meeting-notes' && (
                <div className="risk-indicator" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, gap: '0.75rem' }}>
                    {/* Tab Switcher - always visible */}
                    <div className="tabs-switcher animate-fade" style={{
                        display: 'flex',
                        width: '100%',
                        backgroundColor: 'rgba(0, 0, 0, 0.04)',
                        borderRadius: '10px',
                        padding: '3px',
                        gap: 0
                    }}>
                        <button
                            style={insightsTabButtonStyle(meetingTab === 'transcript')}
                            onClick={(e) => {
                                e.stopPropagation();
                                setMeetingTab('transcript');
                            }}
                        >
                            Transcript
                        </button>
                        <button
                            style={insightsTabButtonStyle(meetingTab === 'generated')}
                            onClick={(e) => {
                                e.stopPropagation();
                                setMeetingTab('generated');
                            }}
                        >
                            Meeting Notes
                        </button>
                    </div>

                    <div className="ai-analysis-content" style={{ minHeight: 0, flex: 1, position: 'relative' }}
                        onMouseEnter={() => setMeetingOutputHovered(true)}
                        onMouseLeave={() => setMeetingOutputHovered(false)}
                    >
                        {/* 1. Transcript Tab View */}
                        {meetingTab === 'transcript' && (
                            <div
                                className="meeting-input-container animate-fade"
                                style={{
                                    position: 'relative',
                                    height: '100%',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}
                                onClick={(e) => e.stopPropagation()}
                            >
                                <textarea
                                    placeholder="Paste or type your meeting transcript here..."
                                    value={transcript}
                                    onChange={(e) => setTranscript(e.target.value)}
                                    readOnly={!!(meetingNotesSummary || meetingNotesLoading || meetingNotesResult)}
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        flex: 1,
                                        padding: mode === 'focused' ? '1.25rem' : '1rem',
                                        paddingBottom: (meetingNotesSummary || meetingNotesLoading || meetingNotesResult) ? '1rem' : (mode === 'focused' ? '60px' : '50px'),
                                        fontSize: mode === 'focused' ? '0.95rem' : '0.875rem',
                                        fontFamily: 'inherit',
                                        resize: 'none',
                                        outline: 'none',
                                        border: 'none',
                                        background: 'transparent',
                                        color: 'var(--text-main)',
                                        lineHeight: '1.6',
                                        boxSizing: 'border-box',
                                        opacity: (meetingNotesSummary || meetingNotesLoading || meetingNotesResult) ? 0.8 : 1
                                    }}
                                />
                                {!meetingNotesSummary && !meetingNotesLoading && !meetingNotesResult && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            e.preventDefault();
                                            e.nativeEvent.stopImmediatePropagation();
                                            handleMeetingNotesSubmit();
                                        }}
                                        disabled={!transcript.trim() || meetingNotesLoading}
                                        style={{
                                            position: 'absolute',
                                            bottom: mode === 'focused' ? '16px' : '12px',
                                            right: mode === 'focused' ? '16px' : '12px',
                                            padding: mode === 'focused' ? '10px 24px' : '6px 16px',
                                            borderRadius: mode === 'focused' ? '10px' : '8px',
                                            background: (!transcript.trim()) ? 'rgba(0,0,0,0.05)' : 'linear-gradient(135deg, #C5B358 0%, #B3A049 100%)',
                                            color: (!transcript.trim()) ? 'var(--text-muted)' : '#fff',
                                            border: 'none',
                                            fontWeight: 700,
                                            fontSize: mode === 'focused' ? '0.85rem' : '0.75rem',
                                            cursor: (!transcript.trim()) ? 'not-allowed' : 'pointer',
                                            transition: 'all 0.2s',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            zIndex: 5,
                                            boxShadow: (!transcript.trim()) ? 'none' : '0 2px 8px rgba(197, 179, 88, 0.25)',
                                        }}
                                    >
                                        {meetingNotesLoading ? 'Analysing...' : 'Analyse'}
                                    </button>
                                )}
                            </div>
                        )}

                        {/* 2. Generated Notes Tab View */}
                        {meetingTab === 'generated' && (
                            <>
                                {(meetingNotesSummary || meetingNotesResult) && (
                                    <InlineCopyButton onClick={handleMeetingNotesCopy} isCopied={meetingNotesCopied} visible={meetingOutputHovered} />
                                )}

                                <div className="ai-analysis-scroll-area">
                                    {meetingNotesError && <p className="error-text">{meetingNotesError}</p>}

                                    {/* No content placeholder */}
                                    {!meetingNotesSummary && !meetingNotesLoading && !meetingNotesResult && (
                                        <div className="animate-fade" style={{
                                            height: '100%',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            padding: '2rem',
                                            textAlign: 'center',
                                            color: 'var(--text-muted)',
                                            fontSize: '0.9rem',
                                            opacity: 0.8,
                                            gap: '1rem'
                                        }}>
                                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5 }}>
                                                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                                                <polyline points="14 2 14 8 20 8"></polyline>
                                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                                <line x1="10" y1="9" x2="8" y2="9"></line>
                                            </svg>
                                            <p>No meeting notes generated yet. <br />Please submit a transcript to begin.</p>
                                        </div>
                                    )}

                                    {/* Focused mode content */}
                                    {mode === 'focused' && (meetingNotesSummary || meetingNotesLoading || meetingNotesResult) && (
                                        <div className="structured-analysis animate-fade">
                                            {/* 1. Summary always at the top */}
                                            {meetingNotesSummary && (
                                                <div className="analysis-section">
                                                    <h4 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>Summary</h4>
                                                    {renderCleanList(meetingNotesSummary)}
                                                </div>
                                            )}

                                            {/* 2. Loading state below summary if still generating details */}
                                            {meetingNotesLoading && (
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
                                                            {!meetingNotesSummary ? 'Generating executive summary...' : 'Generating comprehensive analysis...'}
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            {/* 3. Detailed results below summary (and shimmer) */}
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

                                    {/* Overview mode content */}
                                    {mode === 'overview' && (meetingNotesSummary || meetingNotesLoading) && (
                                        <div className="animate-fade">
                                            {meetingNotesLoading && (
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
                                            {meetingNotesSummary && !meetingNotesLoading && (
                                                <div className="analysis-text animate-fade" style={{ opacity: 0.9 }}>
                                                    <h4 style={{ color: 'var(--primary)', fontSize: '0.8rem', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.1em', opacity: 0.8, fontWeight: 700 }}>Summary</h4>
                                                    {renderCleanList(meetingNotesSummary)}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}

                        {/* 3. Global Reset Button (show on either tab if work has been done) */}
                        {(meetingNotesSummary || meetingNotesResult) && !meetingNotesLoading && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    e.preventDefault();
                                    setMeetingNotesSummary('');
                                    setMeetingNotesResult(null);
                                    setTranscript('');
                                    setMeetingTab('transcript'); // Return to transcript for new input
                                    if (onCacheUpdate) onCacheUpdate({ meetingNotes: null, meetingNotesSummary: '', meetingNotesTranscript: '' });
                                }}
                                style={{
                                    position: 'absolute',
                                    bottom: mode === 'focused' ? '12px' : '10px',
                                    right: mode === 'focused' ? '12px' : '10px',
                                    fontSize: '0.65rem',
                                    color: '#fff',
                                    background: 'linear-gradient(135deg, #C5B358 0%, #B3A049 100%)',
                                    padding: mode === 'focused' ? '8px 20px' : '4px 10px',
                                    borderRadius: mode === 'focused' ? '10px' : '20px',
                                    border: 'none',
                                    fontWeight: 700,
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: mode === 'focused' ? '6px' : '4px',
                                    zIndex: 10,
                                    boxShadow: mode === 'focused' ? '0 3px 12px rgba(197, 179, 88, 0.3)' : '0 2px 8px rgba(197, 179, 88, 0.25)',
                                }}
                            >
                                <svg width={mode === 'focused' ? '12' : '10'} height={mode === 'focused' ? '12' : '10'} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <line x1="12" y1="5" x2="12" y2="19"></line>
                                    <line x1="5" y1="12" x2="19" y2="12"></line>
                                </svg>
                                New Transcript
                            </button>
                        )}
                    </div>
                    {mode === 'overview' && aiDisclaimerPill}
                </div>
            )}

            {insightsMode === 'meeting-notes' && mode === 'focused' && aiDisclaimerPill}

            <RiskLevelInfoModal isOpen={isInfoModalOpen} onClose={() => setIsInfoModalOpen(false)} />
            <AIInfoModal
                isOpen={isAIModalOpen}
                onClose={() => setIsAIModalOpen(false)}
                isMeetingNotes={insightsMode === 'meeting-notes'}
            />
            <AIFeedbackModal
                isOpen={isFeedbackModalOpen}
                onClose={handleCloseFeedbackModal}
                rating={rating}
                setRating={setRating}
                feedbackComment={feedbackComment}
                setFeedbackComment={setFeedbackComment}
                isSubmitting={isSubmittingFeedback}
                submitted={feedbackSubmitted}
                onSubmit={handleFeedbackSubmit}
                error={feedbackError}
                isMeetingNotes={insightsMode === 'meeting-notes'}
            />
        </section>
    );
};

export default Insights;

