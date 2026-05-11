'use client';

import React from 'react';
import { AlertCircle, CheckCircle } from 'lucide-react';

export interface FormInputProps {
    type?: 'email' | 'tel' | 'text' | 'password';
    label?: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    error?: string;
    success?: boolean;
    disabled?: boolean;
    autoComplete?: string;
    required?: boolean;
    icon?: React.ReactNode;
    name?: string;
    id?: string;
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
    (
        {
            type = 'text',
            label,
            placeholder,
            value,
            onChange,
            error,
            success,
            disabled = false,
            autoComplete,
            required = false,
            icon,
            name,
            id,
        },
        ref
    ) => {
        const inputId = id || name || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
        const hasError = !!error;
        const hasSuccess = success && !hasError;

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium mb-2"
                        style={{ color: 'rgb(var(--color-gray-700))' }}
                    >
                        {label}
                        {required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                )}

                <div className="relative">
                    {icon && (
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            {icon}
                        </div>
                    )}

                    <input
                        ref={ref}
                        id={inputId}
                        name={name}
                        type={type}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={placeholder}
                        disabled={disabled}
                        autoComplete={autoComplete}
                        required={required}
                        aria-invalid={hasError}
                        aria-describedby={hasError ? `${inputId}-error` : undefined}
                        className={`
              w-full h-12 px-4 rounded-xl border transition-all duration-200
              text-base
              ${icon ? 'pl-11' : ''}
              ${hasError ? 'pr-11' : hasSuccess ? 'pr-11' : ''}
              ${disabled ? 'bg-gray-100 cursor-not-allowed opacity-60' : 'bg-white'}
              ${hasError
                                ? 'border-red-500 focus:border-red-500 focus:ring-4 focus:ring-red-100'
                                : hasSuccess
                                    ? 'border-green-500 focus:border-green-500 focus:ring-4 focus:ring-green-100'
                                    : 'border-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-100'
                            }
              placeholder:text-gray-400
              focus:outline-none
            `}
                        style={{
                            fontFamily: 'var(--font-family)',
                        }}
                    />

                    {hasError && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <AlertCircle className="w-5 h-5 text-red-500" />
                        </div>
                    )}

                    {hasSuccess && (
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                            <CheckCircle className="w-5 h-5 text-green-500" />
                        </div>
                    )}
                </div>

                {hasError && (
                    <p
                        id={`${inputId}-error`}
                        className="mt-2 text-sm animate-slide-in-top"
                        style={{ color: 'rgb(var(--color-error))' }}
                        role="alert"
                        aria-live="polite"
                    >
                        {error}
                    </p>
                )}
            </div>
        );
    }
);

FormInput.displayName = 'FormInput';
