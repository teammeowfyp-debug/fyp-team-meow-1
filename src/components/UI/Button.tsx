import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'outline' | 'ghost' | 'mode' | 'tab';
    size?: 'small' | 'medium' | 'large';
    isActive?: boolean;
    fullWidth?: boolean;
    as?: any; // To support Link or other components
    children: React.ReactNode;
    [key: string]: any; // Allow for props of the 'as' component (e.g., 'to' for Link)
}

/**
 * Standardized Button component following the gold design system.
 * Use this instead of inline styles to ensure UI maintainability.
 */
export const Button: React.FC<ButtonProps> = ({
    variant = 'outline',
    size = 'medium',
    isActive = false,
    fullWidth = false,
    as: Component = 'button',
    children,
    className = '',
    style = {},
    ...props
}) => {
    // Basic class mapping
    let baseClass = 'btn-base';
    let variantClass = '';
    
    if (variant === 'tab') {
        baseClass = 'btn-tab';
        variantClass = isActive ? 'active' : '';
    } else {
        variantClass = (variant === 'primary' || (variant === 'mode' && isActive)) ? 'btn-primary' : 'btn-outline';
    }

    const sizeClass = size === 'small' ? 'btn-small' : size === 'large' ? 'btn-large' : '';
    const fullWidthClass = fullWidth ? 'w-full' : '';
    
    const combinedClassName = `${baseClass} ${variantClass} ${sizeClass} ${fullWidthClass} ${className}`.trim();

    return (
        <Component
            className={combinedClassName}
            style={style}
            {...props}
        >
            {children}
        </Component>
    );
};
