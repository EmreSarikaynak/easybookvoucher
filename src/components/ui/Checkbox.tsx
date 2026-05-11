'use client';

import React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps {
    label: string;
    checked: boolean;
    onChange: (checked: boolean) => void;
    disabled?: boolean;
    id?: string;
    name?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
    label,
    checked,
    onChange,
    disabled = false,
    id,
    name,
}) => {
    const checkboxId = id || name || `checkbox-${label.toLowerCase().replace(/\s+/g, '-')}`;

    return (
        <div className="flex items-center min-h-[44px]">
            <div className="relative flex items-center">
                <input
                    type="checkbox"
                    id={checkboxId}
                    name={name}
                    checked={checked}
                    onChange={(e) => onChange(e.target.checked)}
                    disabled={disabled}
                    className="sr-only peer"
                    aria-label={label}
                />

                <label
                    htmlFor={checkboxId}
                    className={`
            flex items-center justify-center
            w-5 h-5 rounded
            border-2 transition-all duration-200
            cursor-pointer
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            ${checked
                            ? 'border-blue-500 bg-blue-500'
                            : 'border-gray-300 bg-white hover:border-gray-400'
                        }
            peer-focus-visible:ring-4 peer-focus-visible:ring-blue-100
          `}
                    style={{
                        minWidth: '20px',
                        minHeight: '20px',
                    }}
                >
                    {checked && (
                        <Check className="w-4 h-4 text-white animate-fade-in" strokeWidth={3} />
                    )}
                </label>
            </div>

            <label
                htmlFor={checkboxId}
                className={`
          ml-3 text-sm select-none
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
                style={{
                    color: 'rgb(var(--color-gray-700))',
                    fontFamily: 'var(--font-family)',
                }}
            >
                {label}
            </label>
        </div>
    );
};
