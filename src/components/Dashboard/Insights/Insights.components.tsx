import React from 'react';
import { RISK_LEVEL_DESCRIPTIONS } from './Insights.helpers';
import { FocusModal } from '../../UI/FocusModal';
import { Button } from '../../UI/Button';

export const RiskLevelInfoModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    return (
        <FocusModal
            isOpen={isOpen}
            onClose={onClose}
            modalContentClassName="modal-sm"
        >
            <div className="modal-header" style={{ padding: '2rem 2rem 0rem 2rem' }}>
                <h2 style={{ fontSize: 'var(--text-2xl)', color: 'var(--secondary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>Risk Level Guide</h2>
            </div>
            <div className="modal-body">
                {Object.entries(RISK_LEVEL_DESCRIPTIONS).map(([level, desc]) => (
                    <div key={level}>
                        <h4 style={{ color: 'var(--primary)', fontSize: 'var(--text-base)', display: 'flex', alignItems: 'center', marginTop: '1.5rem', marginBottom: '4px' }}>
                            {level}
                        </h4>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary)', lineHeight: '1.5', opacity: 0.85 }}>{desc}</p>
                    </div>
                ))}
            </div>
        </FocusModal>
    );
};

export const AIInfoModal: React.FC<{ isOpen: boolean; onClose: () => void; isMeetingNotes?: boolean }> = ({ isOpen, onClose, isMeetingNotes }) => {
    return (
        <FocusModal
            isOpen={isOpen}
            onClose={onClose}
            modalContentClassName="modal-sm"
        >
            <div className="modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '0', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                    <h2 style={{ fontSize: 'var(--text-2xl)', color: 'var(--secondary)', margin: 0 }}>
                        How Does AI Generate This Analysis?
                    </h2>
                </div>
            </div>

            <div className="modal-body">
                <section style={{ marginBottom: '1.5rem' }}>
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary)', lineHeight: '1.5', opacity: 0.85, marginBottom: '1rem' }}>
                        {isMeetingNotes
                            ? "Our AI cross-references meeting transcripts with client financial data to deliver five key functions:"
                            : "Our AI synthesizes client financial data across five core analytical pillars to identify misalignments:"}
                    </p>
                    <div style={{ padding: '0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary)', lineHeight: '1.6', margin: 0 }}>
                            <strong style={{ color: 'var(--primary)', fontWeight: 'var(--font-bold)', marginRight: '6px' }}>{isMeetingNotes ? 'Conversation Synthesis:' : 'Temporal Context:'}</strong>
                            <span style={{ opacity: 0.85 }}>{isMeetingNotes ? 'Distills lengthy meeting transcripts into a concise, high-level executive summary.' : 'References valuations and cashflows precisely based on the selected analysis period.'}</span>
                        </p>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary)', lineHeight: '1.6', margin: 0 }}>
                            <strong style={{ color: 'var(--primary)', fontWeight: 'var(--font-bold)', marginRight: '6px' }}>{isMeetingNotes ? 'Key Takeaway Extraction:' : 'Allocation Alignment:'}</strong>
                            <span style={{ opacity: 0.85 }}>{isMeetingNotes ? 'Identifies the most critical decisions and salient points made during the client interaction.' : 'Checks if the volatility of the current portfolio matches the desired risk levels.'}</span>
                        </p>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary)', lineHeight: '1.6', margin: 0 }}>
                            <strong style={{ color: 'var(--primary)', fontWeight: 'var(--font-bold)', marginRight: '6px' }}>{isMeetingNotes ? 'Action Item Tracking:' : 'Risk Capacity:'}</strong>
                            <span style={{ opacity: 0.85 }}>{isMeetingNotes ? 'Automatically generates a structured list of follow-up tasks and next steps discussed in the meeting.' : 'Determines if there is sufficient liquidity to support the risk suggested by their profile.'}</span>
                        </p>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary)', lineHeight: '1.6', margin: 0 }}>
                            <strong style={{ color: 'var(--primary)', fontWeight: 'var(--font-bold)', marginRight: '6px' }}>{isMeetingNotes ? 'Financial Integration:' : 'Structural Integrity:'}</strong>
                            <span style={{ opacity: 0.85 }}>{isMeetingNotes ? 'Connects transcript details with the client\'s actual portfolio data to provide deeper financial context.' : 'Identifies conflicts between illiquid assets, plan overlaps, or insurance coverage holes.'}</span>
                        </p>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--secondary)', lineHeight: '1.6', margin: 0 }}>
                            <strong style={{ color: 'var(--primary)', fontWeight: 'var(--font-bold)', marginRight: '6px' }}>{isMeetingNotes ? 'Strategic Alignment:' : 'Gap Synthesis:'}</strong>
                            <span style={{ opacity: 0.85 }}>{isMeetingNotes ? 'Evaluates how the meeting\'s discussion aligns with the client\'s target goals and risk profile.' : 'Pinpoints the specific delta between the client\'s current reality and their target goals.'}</span>
                        </p>
                    </div>
                </section>

                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontStyle: 'italic', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    This analysis is supplementary and should be reviewed by a professional advisor before informing any financial decisions.
                </p>
            </div>
        </FocusModal>
    );
};

export const AIFeedbackModal: React.FC<{
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
}> = ({ isOpen, onClose, rating, setRating, feedbackComment, setFeedbackComment, isSubmitting, submitted, onSubmit, error }) => {
    return (
        <FocusModal
            isOpen={isOpen}
            onClose={onClose}
            modalContentClassName="modal-sm"
        >
            <div className="modal-header">
                <h2 style={{ fontSize: 'var(--text-2xl)', color: 'var(--secondary)', borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>Was This Analysis Helpful?</h2>
            </div>

            <div className="modal-body">
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: '0rem', marginBottom: '1.5rem', lineHeight: '1.5' }}>
                    Your feedback helps us improve the relevance and accuracy of our AI-powered features.
                </p>

                {!submitted ? (
                    <>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '20px' }}>
                            <button
                                onClick={() => setRating(true)}
                                style={{
                                    background: rating === true ? 'rgba(113, 146, 102, 0.15)' : 'rgba(0,0,0,0.02)',
                                    border: `1px solid ${rating === true ? 'var(--success)' : 'var(--primary)'}`,
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
                                    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                                </svg>
                            </button>
                            <button
                                onClick={() => setRating(false)}
                                style={{
                                    background: rating === false ? 'rgba(155, 34, 38, 0.1)' : 'rgba(0,0,0,0.02)',
                                    border: `1px solid ${rating === false ? '#9B2226' : 'var(--primary)'}`,
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
                                    <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-3"></path>
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
                                    fontSize: 'var(--text-sm)',
                                    fontFamily: 'inherit',
                                    resize: 'none',
                                    outline: 'none',
                                    boxSizing: 'border-box'
                                }}
                            />

                            {error && (
                                <p style={{ color: 'var(--danger)', fontSize: 'var(--text-xs)', fontWeight: 500, textAlign: 'center', margin: 0 }}>
                                    {error}
                                </p>
                            )}

                            <Button
                                onClick={onSubmit}
                                disabled={isSubmitting || rating === null}
                                variant="primary"
                                fullWidth
                            >
                                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
                            </Button>
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
                        fontSize: 'var(--text-2xl)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        Thank you for your feedback!
                    </div>
                )}
            </div>
        </FocusModal>
    );
};

export const renderCleanList = (content: string) => {
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
                    fontSize: 'var(--text-base)',
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

export const InlineCopyButton: React.FC<{ onClick: (e: React.MouseEvent) => void; isCopied: boolean; visible: boolean }> = ({ onClick, isCopied, visible }) => (
    <Button
        onClick={onClick}
        variant="outline"
        className="solid"
        size="small"
        style={{
            position: 'absolute',
            top: '0.65rem',
            right: '0.65rem',
            color: 'var(--primary)',
            borderColor: 'var(--primary)',
            padding: '4px 8px',
            borderRadius: '6px',
            opacity: visible || isCopied ? 1 : 0,
            pointerEvents: visible || isCopied ? 'auto' : 'none',
            zIndex: 10,
            fontSize: '10px'
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
    </Button>
);

export const AIDisclaimerButton: React.FC<{
    onClick: (e: React.MouseEvent) => void;
    children: React.ReactNode;
    icon?: React.ReactNode;
    style?: React.CSSProperties;
}> = ({ onClick, children, icon, style }) => (
    <button
        onClick={(e) => { e.stopPropagation(); onClick(e); }}
        style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '0.5rem 1rem',
            background: 'rgba(0,0,0,0.06)',
            border: '1px solid transparent',
            borderRadius: '20px',
            color: 'var(--text-muted)',
            fontSize: '11px',
            fontWeight: 'var(--font-semibold)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            ...style
        }}
        onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--primary-glow)';
            e.currentTarget.style.borderColor = 'rgba(197, 179, 88, 0.2)';
            e.currentTarget.style.color = 'var(--primary)';
        }}
        onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0,0,0,0.06)';
            e.currentTarget.style.borderColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted)';
        }}
    >
        {icon}
        <span>{children}</span>
    </button>
);

export const AIDisclaimerPill: React.FC<{
    mode: 'overview' | 'focused';
    onAIModalOpen: () => void;
    onFeedbackModalOpen: () => void;
    /** Optional: show an action pill (overview beside notice, focused beside Provide Feedback). */
    actionLabel?: string;
    onAction?: () => void;
    actionDisabled?: boolean;
}> = ({ mode, onAIModalOpen, onFeedbackModalOpen, actionLabel, onAction, actionDisabled }) => {
    if (mode === 'overview') {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                width: '100%',
                marginBottom: '-0.25rem',
                marginTop: '0.25rem'
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '0.4rem 1rem',
                        background: 'rgba(0,0,0,0.06)',
                        borderRadius: '20px',
                        color: 'var(--text-muted)',
                        fontSize: '11px',
                        fontWeight: 'var(--font-semibold)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="16" x2="12" y2="12"></line>
                            <line x1="12" y1="8" x2="12.01" y2="8"></line>
                        </svg>
                        <span>This analysis is generated by AI</span>
                    </div>

                    {actionLabel && onAction && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                onAction();
                            }}
                            disabled={!!actionDisabled}
                            style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '0.4rem 1rem',
                                borderRadius: '999px',
                                background: 'var(--primary)',
                                border: '1px solid rgba(197, 179, 88, 0.28)',
                                color: '#fff',
                                fontSize: '11px',
                                fontWeight: 'var(--font-semibold)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.05em',
                                cursor: actionDisabled ? 'not-allowed' : 'pointer',
                                opacity: actionDisabled ? 0.65 : 1,
                                transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={(e) => {
                                if ((e.currentTarget as HTMLButtonElement).disabled) return;
                                (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(0.95)';
                            }}
                            onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.filter = 'none';
                            }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.95 }}>
                                <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.36-2.64"></path>
                                <polyline points="3 12 3 18 9 18"></polyline>
                                <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64"></path>
                                <polyline points="21 12 21 6 15 6"></polyline>
                            </svg>
                            <span>{actionLabel}</span>
                        </button>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'flex-start',
            padding: '0',
            marginTop: '1.25rem',
            marginBottom: '-0.25rem',
            width: '100%'
        }}>
            <AIDisclaimerButton
                onClick={onAIModalOpen}
                icon={
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                }
            >
                How Does AI Generate This Analysis?
            </AIDisclaimerButton>

            {actionLabel && onAction && (
                <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        onAction();
                    }}
                    disabled={!!actionDisabled}
                    style={{
                        marginLeft: 'auto',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '0.4rem 1rem',
                        borderRadius: '999px',
                        background: 'var(--primary)',
                        border: '1px solid rgba(197, 179, 88, 0.28)',
                        color: '#fff',
                        fontSize: '11px',
                        fontWeight: 'var(--font-semibold)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        cursor: actionDisabled ? 'not-allowed' : 'pointer',
                        opacity: actionDisabled ? 0.65 : 1,
                        transition: 'all 0.2s ease',
                    }}
                    onMouseEnter={(e) => {
                        if ((e.currentTarget as HTMLButtonElement).disabled) return;
                        (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(0.95)';
                    }}
                    onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.filter = 'none';
                    }}
                >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.95 }}>
                        <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-6.36-2.64"></path>
                        <polyline points="3 12 3 18 9 18"></polyline>
                        <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 6.36 2.64"></path>
                        <polyline points="21 12 21 6 15 6"></polyline>
                    </svg>
                    <span>{actionLabel}</span>
                </button>
            )}

            <AIDisclaimerButton
                onClick={onFeedbackModalOpen}
                style={{ marginLeft: actionLabel && onAction ? '0.5rem' : 'auto' }}
                icon={
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                }
            >
                Provide Feedback
            </AIDisclaimerButton>
        </div>
    );
};
