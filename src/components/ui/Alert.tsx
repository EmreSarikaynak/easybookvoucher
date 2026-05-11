'use client';

import React, { useEffect } from 'react';
import { AlertCircle, CheckCircle, Info, X, AlertTriangle } from 'lucide-react';

export type AlertType = 'error' | 'success' | 'warning' | 'info';

export interface AlertProps {
    type: AlertType;
    message: string;
    onClose?: () => void;
    autoClose?: boolean;
    autoCloseDuration?: number;
}

const alertConfig = {
    error: {
        icon: AlertCircle,
        bgColor: 'rgb(var(--color-error-bg))',
        borderColor: 'rgb(var(--color-error))',
        textColor: 'rgb(var(--color-error))',
        iconColor: 'rgb(var(--color-error))',
    },
    success: {
        icon: CheckCircle,
        bgColor: 'rgb(var(--color-success-bg))',
        borderColor: 'rgb(var(--color-success))',
        textColor: 'rgb(var(--color-success-dark, 5 122 85))',
        iconColor: 'rgb(var(--color-success))',
    },
    warning: {
        icon: AlertTriangle,
        bgColor: 'rgb(var(--color-warning-bg))',
        borderColor: 'rgb(var(--color-warning))',
        textColor: 'rgb(var(--color-warning-dark, 180 83 9))',
        iconColor: 'rgb(var(--color-warning))',
    },
    info: {
        icon: Info,
        bgColor: 'rgb(var(--color-info-bg))',
        borderColor: 'rgb(var(--color-info))',
        textColor: 'rgb(var(--color-info-dark, 29 78 216))',
        iconColor: 'rgb(var(--color-info))',
    },
};

export const Alert: React.FC<AlertProps> = ({
    type,
    message,
    onClose,
    autoClose = false,
    autoCloseDuration = 5000,
}) => {
    const config = alertConfig[type];
    const IconComponent = config.icon;

    useEffect(() => {
        if (autoClose && onClose) {
            const timer = setTimeout(() => {
                onClose();
            }, autoCloseDuration);

            return () => clearTimeout(timer);
        }
    }, [autoClose, autoCloseDuration, onClose]);

    return (
        <div
            className="flex items-start gap-3 p-4 rounded-lg border animate-slide-in-top"
            style={{
                backgroundColor: config.bgColor,
                borderColor: config.borderColor,
            }}
            role="alert"
            aria-live="polite"
        >
            <div className="flex-shrink-0 mt-0.5">
                <IconComponent
                    className="w-5 h-5"
                    style={{ color: config.iconColor }}
                />
            </div>

            <div className="flex-1 text-sm leading-relaxed" style={{ color: config.textColor }}>
                {message}
            </div>

            {onClose && (
                <button
                    onClick={onClose}
                    className="flex-shrink-0 p-1 rounded hover:bg-black/5 transition-colors touch-manipulation"
                    aria-label="Uyarıyı kapat"
                >
                    <X className="w-4 h-4" style={{ color: config.textColor }} />
                </button>
            )}
        </div>
    );
};
