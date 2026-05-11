'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export interface PrimaryButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    loading?: boolean;
    disabled?: boolean;
    fullWidth?: boolean;
    className?: string;
}

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
    children,
    onClick,
    type = 'button',
    loading = false,
    disabled = false,
    fullWidth = false,
    className = '',
}) => {
    const isDisabled = disabled || loading;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={isDisabled}
            className={`
        relative flex items-center justify-center gap-2
        h-12 md:h-13 px-6
        rounded-xl
        font-semibold text-base text-white
        transition-all duration-200
        touch-manipulation no-select
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg'
                }
        ${className}
      `}
            style={{
                background: isDisabled
                    ? 'rgb(var(--color-gray-400))'
                    : 'linear-gradient(135deg, rgb(var(--color-primary)) 0%, rgb(var(--color-primary-dark)) 100%)',
                fontFamily: 'var(--font-family)',
            }}
            aria-busy={loading}
        >
            {loading && (
                <Loader2 className="w-5 h-5 animate-spinner" />
            )}
            {children}
        </button>
    );
};
