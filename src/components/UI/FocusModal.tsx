import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface FocusModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    modalContentStyle?: React.CSSProperties;
    modalContentClassName?: string;
    /** Extra class on the backdrop (e.g. `modal-overlay--centered` for small dialogs). */
    overlayClassName?: string;
    closeButtonStyle?: React.CSSProperties;
    closeOnBackdropClick?: boolean;
}

export const FocusModal: React.FC<FocusModalProps> = ({
    isOpen,
    onClose,
    children,
    modalContentStyle = {},
    modalContentClassName = "",
    overlayClassName = "",
    closeButtonStyle = {},
    closeOnBackdropClick = true
}) => {
    // Prevent body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            const originalStyle = window.getComputedStyle(document.body).overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalStyle;
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return createPortal(
        <div 
            className={`modal-overlay animate-fade ${overlayClassName}`.trim()} 
            onClick={closeOnBackdropClick ? onClose : undefined} 
            style={{ zIndex: 9999 }}
        >
            <div 
                className={`modal-content ${modalContentClassName}`} 
                onClick={(e) => e.stopPropagation()} 
                style={{
                    position: 'relative', 
                    display: 'flex', 
                    flexDirection: 'column',
                    background: '#fff', 
                    borderRadius: '24px', 
                    boxShadow: 'var(--shadow-xl)',
                    ...modalContentStyle
                }}
            >
                <button
                    onClick={onClose}
                    style={{ 
                        position: 'absolute',
                        top: '0.25rem', 
                        right: '1rem', 
                        background: 'transparent', 
                        border: 'none', 
                        fontSize: '1.8rem', 
                        cursor: 'pointer', 
                        color: 'var(--text-muted)', 
                        padding: '10px', 
                        zIndex: 10,
                        ...closeButtonStyle
                    }}
                >
                    &times;
                </button>
                {children}
            </div>
        </div>,
        document.body
    );
};
