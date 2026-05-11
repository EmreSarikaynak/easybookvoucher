'use client';

import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { FormInput, FormInputProps } from './FormInput';

type PasswordInputProps = Omit<FormInputProps, 'type' | 'icon'>;

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
    (props, ref) => {
        const [showPassword, setShowPassword] = useState(false);

        const togglePasswordVisibility = () => {
            setShowPassword((prev) => !prev);
        };

        return (
            <div className="relative w-full">
                <FormInput
                    {...props}
                    ref={ref}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete={props.autoComplete || 'current-password'}
                />

                <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-4 top-[50%] -translate-y-1/2 p-2 touch-manipulation"
                    style={{
                        marginTop: props.label ? '14px' : '0',
                    }}
                    aria-label={showPassword ? 'Şifreyi gizle' : 'Şifreyi göster'}
                    tabIndex={0}
                >
                    {showPassword ? (
                        <EyeOff className="w-5 h-5 text-gray-500 hover:text-gray-700 transition-colors" />
                    ) : (
                        <Eye className="w-5 h-5 text-gray-500 hover:text-gray-700 transition-colors" />
                    )}
                </button>
            </div>
        );
    }
);

PasswordInput.displayName = 'PasswordInput';
