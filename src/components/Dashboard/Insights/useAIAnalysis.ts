import { useState, useCallback } from 'react';
import { submitAIFeedback } from '../../../lib/insightsAI';

export const useAIAnalysis = (
    clientId: string | undefined,
    aiType: 'risk_analysis' | 'meeting_notes'
) => {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [summary, setSummary] = useState<string>('');
    const [result, setResult] = useState<any>(null);
    const [copied, setCopied] = useState<boolean>(false);

    // AI Feedback State
    const [rating, setRating] = useState<boolean | null>(null);
    const [feedbackComment, setFeedbackComment] = useState<string>('');
    const [isSubmittingFeedback, setIsSubmittingFeedback] = useState<boolean>(false);
    const [feedbackSubmitted, setFeedbackSubmitted] = useState<boolean>(false);
    const [feedbackError, setFeedbackError] = useState<string | null>(null);

    const handleCopy = useCallback((textToCopy: string) => {
        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    }, []);

    const handleFeedbackSubmit = useCallback(async (formattedContent: string) => {
        if (!clientId || rating === null) return;
        setIsSubmittingFeedback(true);
        setFeedbackError(null);
        try {
            await submitAIFeedback({
                client_id: clientId,
                rating,
                comment: feedbackComment || undefined,
                generated_content: formattedContent,
                ai_type: aiType === 'meeting_notes' ? 'meeting_notes' : 'risk_analysis'
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
    }, [clientId, rating, feedbackComment, aiType]);

    const resetFeedback = useCallback(() => {
        setRating(null);
        setFeedbackComment('');
        setFeedbackSubmitted(false);
        setFeedbackError(null);
    }, []);

    const reset = useCallback(() => {
        setSummary('');
        setResult(null);
        setError(null);
        setLoading(false);
        resetFeedback();
    }, [resetFeedback]);

    return {
        loading, setLoading,
        error, setError,
        summary, setSummary,
        result, setResult,
        copied, setCopied,
        handleCopy,
        rating, setRating,
        feedbackComment, setFeedbackComment,
        isSubmittingFeedback, feedbackSubmitted,
        feedbackError, handleFeedbackSubmit,
        resetFeedback,
        reset
    };
};
