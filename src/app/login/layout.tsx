import React from 'react';
import { Metadata } from 'next';
import { PlatformFooter } from '@/components/layout/platform-footer';
import { SecestaFooter } from '@/components/layout/secesta-footer';

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
        <div className="min-h-screen gradient-bg-login flex flex-col">
            <div className="flex-1 flex items-center justify-center p-4">
                {children}
            </div>
            <PlatformFooter variant="login" />
            <SecestaFooter variant="login" showPlatformNote />
        </div>
    );
}
