import React from 'react';
import { FocusModal } from '../../UI/FocusModal';
import { Button } from '../../UI/Button';
import { titleForAiErrorCode } from '../../../lib/aiErrors';

interface AiErrorModalProps {
    open: boolean;
    onClose: () => void;
    message: string | null;
    code?: string | null;
}

/**
 * Compact, centered AI / API error dialog (rate limits, model load, etc.).
 */
export const AiErrorModal: React.FC<AiErrorModalProps> = ({ open, onClose, message, code }) => {
    if (!message) return null;

    return (
        <FocusModal
            isOpen={open}
            onClose={onClose}
            overlayClassName="modal-overlay--centered"
            modalContentClassName="modal-content--compact ai-error-modal"
            modalContentStyle={{
                padding: '1.125rem 1.25rem 1rem',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                boxShadow: '0 18px 48px rgba(0, 0, 0, 0.12)',
                background: 'var(--bg-card, #fff)',
            }}
            closeButtonStyle={{
                top: '0.35rem',
                right: '0.45rem',
                fontSize: '1.35rem',
                padding: '6px',
            }}
        >
            <div className="ai-error-modal__inner" style={{ paddingRight: '0.25rem' }}>
                <h3 className="ai-error-modal__title">
                    {titleForAiErrorCode(code)}
                </h3>
                <p className="ai-error-modal__body">
                    {message}
                </p>
                {code && (
                    <p className="ai-error-modal__ref">
                        Ref: {code}
                    </p>
                )}
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <Button variant="outline" size="small" onClick={onClose} style={{ minWidth: '100px' }}>
                        Dismiss
                    </Button>
                </div>
            </div>
        </FocusModal>
    );
};
