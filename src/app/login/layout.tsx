import React from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Giriş Yap - EasyBookTours Acente Paneli',
    description: 'EasyBookTours Bilet Yönetim Sistemi - Acente Girişi',
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen gradient-bg-login flex items-center justify-center p-4">
            {children}
        </div>
    );
}
