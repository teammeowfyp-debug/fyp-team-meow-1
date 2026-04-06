import React, { useState, useEffect, useRef } from 'react';

interface CustomSelectOption {
    label: string;
    value: string;
}

interface CustomSelectProps {
    label?: string;
    value: string | string[];
    options: CustomSelectOption[];
    onChange: (val: any) => void;
    multi?: boolean;
    style?: React.CSSProperties;
    triggerStyle?: React.CSSProperties;
    optionsStyle?: React.CSSProperties;
    wrapperStyle?: React.CSSProperties;
    placeholder?: string;
    className?: string;
    error?: boolean;
    disabled?: boolean;
    /** If true, calls stopPropagation/preventDefault on clicks to prevent parent interaction */
    preventParentInteraction?: boolean;
}

const CustomSelect: React.FC<CustomSelectProps> = ({ 
    label, 
    value, 
    options, 
    onChange, 
    multi = false, 
    style,
    triggerStyle,
    optionsStyle,
    wrapperStyle,
    placeholder = 'Select...',
    className = '',
    error = false,
    disabled = false,
    preventParentInteraction = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const isSelected = (val: string) => {
        if (multi && Array.isArray(value)) return (value as string[]).includes(val);
        return value === val;
    };

    const handleSelect = (val: string, e: React.MouseEvent) => {
        if (disabled) return;
        if (preventParentInteraction) {
            e.stopPropagation();
            e.preventDefault();
        }

        if (!multi) {
            onChange(val);
            setIsOpen(false);
            return;
        }

        const currentValues = Array.isArray(value) ? [...value] : [];

        if (val === 'All') {
            onChange(['All']);
        } else {
            const newValues = currentValues.filter(v => v !== 'All');
            if (newValues.includes(val)) {
                const filtered = newValues.filter(v => v !== val);
                onChange(filtered.length === 0 ? ['All'] : filtered);
            } else {
                onChange([...newValues, val]);
            }
        }
    };

    const getTriggerLabel = () => {
        if (!multi) {
            const opt = options.find(o => o.value === value);
            return opt ? opt.label : (value as string) || placeholder;
        }
        
        const currentValues = Array.isArray(value) ? value : [];
        if (currentValues.includes('All')) return 'All';
        if (currentValues.length === 0) return placeholder;
        if (currentValues.length === 1) {
             const opt = options.find(o => o.value === currentValues[0]);
             return opt ? opt.label : currentValues[0];
        }
        return `${currentValues.length} Selected`;
    };

    const handleTriggerClick = (e: React.MouseEvent) => {
        if (disabled) return;
        if (preventParentInteraction) {
            e.stopPropagation();
            e.preventDefault();
            // Using stopImmediatePropagation if available via nativeEvent
            e.nativeEvent.stopImmediatePropagation?.();
        }
        setIsOpen(!isOpen);
    };

    return (
        <div 
            className={`filter-group ${className} ${disabled ? 'disabled' : ''}`} 
            ref={dropdownRef} 
            style={style}
            onMouseDown={preventParentInteraction ? (e) => e.stopPropagation() : undefined}
            onMouseUp={preventParentInteraction ? (e) => e.stopPropagation() : undefined}
        >
            {label && <label>{label}</label>}
            <div className="custom-select-wrapper" style={{ width: '100%', ...wrapperStyle }}>
                <div
                    className={`custom-select-trigger ${isOpen ? 'open' : ''} ${error ? 'select-error' : ''} ${disabled ? 'disabled' : ''}`}
                    onClick={handleTriggerClick}
                    style={triggerStyle}
                >
                    <span style={{ color: !value || (Array.isArray(value) && value.length === 0) ? 'var(--text-muted)' : 'inherit' }}>
                        {getTriggerLabel()}
                    </span>
                    <svg className="chevron" viewBox="0 0 24 24" stroke="currentColor" fill="none">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
                {isOpen && !disabled && (
                    <div className="custom-select-options glass-card" style={optionsStyle}>
                        {options.map(opt => (
                            <div
                                key={opt.value}
                                className={`custom-select-option ${isSelected(opt.value) ? 'selected' : ''}`}
                                onClick={(e) => handleSelect(opt.value, e)}
                            >
                                {opt.label}
                                {isSelected(opt.value) && <span>✓</span>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomSelect;
