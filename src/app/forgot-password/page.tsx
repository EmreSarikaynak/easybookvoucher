'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, CheckCircle } from 'lucide-react';
import { FormInput } from '@/components/ui/FormInput';
import { PrimaryButton } from '@/components/ui/PrimaryButton';
import { Alert } from '@/components/ui/Alert';
import { validateEmail } from '@/lib/utils/format';

export default function ForgotPasswordPage() {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validate email
        if (!email.trim()) {
            setError('E-posta adresinizi girin');
            return;
        }

        if (!validateEmail(email)) {
            setError('Geçerli bir e-posta adresi girin');
            return;
        }

        setLoading(true);

        try {
            // TODO: Implement password reset with Supabase
            // const { error } = await supabase.auth.resetPasswordForEmail(email, {
            //   redirectTo: `${window.location.origin}/reset-password`,
            // });

            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1500));

            setSuccess(true);
        } catch (err) {
            setError('Bir hata oluştu. Lütfen tekrar deneyin.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen gradient-bg-login flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Back to Login */}
                <Link
                    href="/login"
                    className="inline-flex items-center gap-2 text-white hover:underline mb-6"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Giriş Ekranına Dön
                </Link>

                {/* Card */}
                <div
                    className="bg-white rounded-2xl p-6 md:p-8 animate-slide-in-top"
                    style={{ boxShadow: 'var(--shadow-xl)' }}
                >
                    {!success ? (
                        <>
                            {/* Icon */}
                            <div className="flex justify-center mb-6">
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center"
                                    style={{
                                        background: 'linear-gradient(135deg, rgb(var(--color-primary)) 0%, rgb(var(--color-secondary)) 100%)',
                                    }}
                                >
                                    <Mail className="w-8 h-8 text-white" />
                                </div>
                            </div>

                            {/* Title */}
                            <h1
                                className="text-2xl font-bold text-center mb-2"
                                style={{
                                    color: 'rgb(var(--color-gray-900))',
                                    fontFamily: 'var(--font-family)',
                                }}
                            >
                                Şifrenizi mi Unuttunuz?
                            </h1>

                            {/* Subtitle */}
                            <p
                                className="text-sm text-center mb-8"
                                style={{
                                    color: 'rgb(var(--color-gray-600))',
                                    fontFamily: 'var(--font-family)',
                                }}
                            >
                                E-posta adresinizi girin, size şifre sıfırlama bağlantısı gönderelim.
                            </p>

                            {/* Error Alert */}
                            {error && (
                                <div className="mb-4">
                                    <Alert type="error" message={error} onClose={() => setError('')} />
                                </div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <FormInput
                                    type="email"
                                    label="E-posta Adresi"
                                    placeholder="ornek@domain.com"
                                    value={email}
                                    onChange={setEmail}
                                    error={error}
                                    disabled={loading}
                                    autoComplete="email"
                                    required
                                    name="email"
                                />

                                <PrimaryButton type="submit" loading={loading} disabled={loading} fullWidth>
                                    {loading ? 'Gönderiliyor...' : 'Sıfırlama Bağlantısı Gönder'}
                                </PrimaryButton>
                            </form>

                            {/* Help Text */}
                            <p
                                className="text-xs text-center mt-6"
                                style={{
                                    color: 'rgb(var(--color-gray-500))',
                                    fontFamily: 'var(--font-family)',
                                }}
                            >
                                Hesabınıza giriş yapamıyorsanız,{' '}
                                <a
                                    href="mailto:peterpan4865@gmail.com"
                                    className="hover:underline"
                                    style={{ color: 'rgb(var(--color-primary))' }}
                                >
                                    destek ekibimizle
                                </a>{' '}
                                iletişime geçin.
                            </p>
                        </>
                    ) : (
                        <>
                            {/* Success Icon */}
                            <div className="flex justify-center mb-6">
                                <div
                                    className="w-16 h-16 rounded-full flex items-center justify-center"
                                    style={{ backgroundColor: 'rgb(var(--color-success))' }}
                                >
                                    <CheckCircle className="w-8 h-8 text-white" />
                                </div>
                            </div>

                            {/* Success Title */}
                            <h2
                                className="text-2xl font-bold text-center mb-3"
                                style={{
                                    color: 'rgb(var(--color-gray-900))',
                                    fontFamily: 'var(--font-family)',
                                }}
                            >
                                E-posta Gönderildi!
                            </h2>

                            {/* Success Message */}
                            <p
                                className="text-sm text-center mb-8"
                                style={{
                                    color: 'rgb(var(--color-gray-600))',
                                    fontFamily: 'var(--font-family)',
                                }}
                            >
                                <strong>{email}</strong> adresine şifre sıfırlama bağlantısı gönderdik.
                                Lütfen e-posta kutunuzu kontrol edin.
                            </p>

                            {/* Info Box */}
                            <div
                                className="p-4 rounded-lg mb-6"
                                style={{ backgroundColor: 'rgb(var(--color-info) / 0.1)' }}
                            >
                                <p
                                    className="text-sm"
                                    style={{
                                        color: 'rgb(var(--color-gray-700))',
                                        fontFamily: 'var(--font-family)',
                                    }}
                                >
                                    <strong>Not:</strong> E-posta birkaç dakika içinde ulaşmadıysa, spam klasörünüzü kontrol edin.
                                </p>
                            </div>

                            {/* Back to Login Button */}
                            <Link href="/login">
                                <PrimaryButton type="button" fullWidth>
                                    Giriş Ekranına Dön
                                </PrimaryButton>
                            </Link>

                            {/* Resend Link */}
                            <p
                                className="text-xs text-center mt-6"
                                style={{
                                    color: 'rgb(var(--color-gray-500))',
                                    fontFamily: 'var(--font-family)',
                                }}
                            >
                                E-posta almadınız mı?{' '}
                                <button
                                    onClick={() => {
                                        setSuccess(false);
                                        setEmail('');
                                    }}
                                    className="hover:underline"
                                    style={{ color: 'rgb(var(--color-primary))' }}
                                >
                                    Tekrar gönder
                                </button>
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
