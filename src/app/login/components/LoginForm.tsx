'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FormInput } from '@/components/ui/FormInput';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Checkbox } from '@/components/ui/Checkbox';
import { LinkComponent } from '@/components/ui/Link';
import { Alert } from '@/components/ui/Alert';
import { validateIdentifier, formatPhone, detectInputType } from '@/lib/utils/format';
import { loginAction, type AuthError } from '@/lib/auth/client';

export const LoginForm: React.FC = () => {
    const router = useRouter();
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<{ identifier?: string; password?: string }>({});
    const [alert, setAlert] = useState<{ type: 'error' | 'success'; message: string } | null>(null);
    const [siteLogo, setSiteLogo] = useState<string | null>(null);
    const [logoLoading, setLogoLoading] = useState(true);

    // Fetch site logo
    useEffect(() => {
        import('@/app/actions/settings').then(mod => {
            mod.getSetting('site_logo').then(logo => {
                if (typeof logo === 'string') setSiteLogo(logo);
                setLogoLoading(false);
            }).catch(() => {
                setLogoLoading(false);
            });
        });
    }, []);

    const handleIdentifierChange = (value: string) => {
        // Auto-format phone numbers
        if (detectInputType(value) === 'phone') {
            setIdentifier(formatPhone(value));
        } else {
            setIdentifier(value);
        }

        // Clear error when user types
        if (errors.identifier) {
            setErrors((prev) => ({ ...prev, identifier: undefined }));
        }
    };

    const handlePasswordChange = (value: string) => {
        setPassword(value);
        // Clear error when user types
        if (errors.password) {
            setErrors((prev) => ({ ...prev, password: undefined }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: { identifier?: string; password?: string } = {};

        // Validate identifier (email or phone)
        if (!identifier.trim()) {
            newErrors.identifier = 'E-posta adresiniz veya telefon numaranız gereklidir';
        } else {
            const validation = validateIdentifier(identifier);
            if (!validation.isValid) {
                newErrors.identifier = validation.message;
            }
        }

        // Validate password
        if (!password.trim()) {
            newErrors.password = 'Şifreniz gereklidir';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setAlert(null);

        // Client-side validation
        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            const response = await loginAction({
                identifier: identifier.trim(),
                password,
                rememberMe,
            });

            if (response.success) {
                // Show success message
                setAlert({
                    type: 'success',
                    message: 'Giriş başarılı! Panele yönlendiriliyorsunuz...',
                });

                // Redirect to dashboard after a short delay
                setTimeout(() => {
                    router.push('/');
                }, 1000);
            } else {
                // Show error message
                setAlert({
                    type: 'error',
                    message: response.error?.message || 'Giriş yapılamadı. Lütfen tekrar deneyin.',
                });
            }
        } catch (error) {
            console.error('Login error:', error);
            setAlert({
                type: 'error',
                message: 'Beklenmeyen bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            className="w-full max-w-md mx-auto p-6 md:p-8 bg-white rounded-2xl animate-slide-in-top"
            style={{
                boxShadow: 'var(--shadow-xl)',
            }}
        >
            {/* Logo */}
            <div className="flex justify-center mb-6">
                {!logoLoading && siteLogo ? (
                    <img
                        src={siteLogo}
                        alt="Logo"
                        className="h-12 md:h-16 object-contain"
                    />
                ) : !logoLoading ? (
                    <div
                        className="text-2xl md:text-3xl font-bold"
                        style={{
                            background: 'linear-gradient(135deg, rgb(var(--color-primary)) 0%, rgb(var(--color-secondary)) 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            backgroundClip: 'text',
                            fontFamily: 'var(--font-family)',
                        }}
                    >
                        EasyBookTours
                    </div>
                ) : (
                    <div className="h-12 md:h-16 w-48 bg-gray-200 animate-pulse rounded"></div>
                )}
            </div>

            {/* Title */}
            <h1
                className="text-2xl font-bold text-center mb-2"
                style={{
                    color: 'rgb(var(--color-gray-900))',
                    fontFamily: 'var(--font-family)',
                }}
            >
                Acente Girişi
            </h1>

            {/* Subtitle */}
            <p
                className="text-sm text-center mb-8"
                style={{
                    color: 'rgb(var(--color-gray-600))',
                    fontFamily: 'var(--font-family)',
                }}
            >
                Hesabınıza giriş yaparak işlemlerinizi yönetin.
            </p>

            {/* Alert */}
            {alert && (
                <div className="mb-4">
                    <Alert
                        type={alert.type}
                        message={alert.message}
                        onClose={() => setAlert(null)}
                        autoClose={alert.type === 'error'}
                    />
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Email or Phone */}
                <FormInput
                    label="E-posta veya Telefon"
                    placeholder="ornek@domain.com veya +90 5XX XXX XX XX"
                    value={identifier}
                    onChange={handleIdentifierChange}
                    error={errors.identifier}
                    disabled={loading}
                    autoComplete="username"
                    required
                    name="identifier"
                />

                {/* Password */}
                <PasswordInput
                    label="Şifre"
                    placeholder="Şifrenizi girin"
                    value={password}
                    onChange={handlePasswordChange}
                    error={errors.password}
                    disabled={loading}
                    required
                    name="password"
                />

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between">
                    <Checkbox
                        label="Beni Hatırla"
                        checked={rememberMe}
                        onChange={setRememberMe}
                        disabled={loading}
                        name="rememberMe"
                    />
                    <LinkComponent href="/forgot-password">
                        Şifremi Unuttum
                    </LinkComponent>
                </div>

                {/* Submit Button */}
                <PrimaryButton
                    type="submit"
                    loading={loading}
                    disabled={loading}
                    fullWidth
                >
                    {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
                </PrimaryButton>

                {/* Legal Text */}
                <p
                    className="text-xs text-center leading-relaxed"
                    style={{
                        color: 'rgb(var(--color-gray-500))',
                        fontFamily: 'var(--font-family)',
                    }}
                >
                    Giriş yaparak{' '}
                    <a
                        href="/terms"
                        className="text-xs inline hover:underline transition-colors"
                        style={{ color: 'rgb(var(--color-primary))' }}
                    >
                        Kullanım Şartları
                    </a>
                    ,{' '}
                    <a
                        href="/privacy"
                        className="text-xs inline hover:underline transition-colors"
                        style={{ color: 'rgb(var(--color-primary))' }}
                    >
                        Gizlilik Politikası
                    </a>
                    {' '}ve{' '}
                    <a
                        href="/kvkk"
                        className="text-xs inline hover:underline transition-colors"
                        style={{ color: 'rgb(var(--color-primary))' }}
                    >
                        KVKK
                    </a>
                    {' '}metnini kabul etmiş olursunuz.
                </p>
            </form>
        </div>
    );
};
