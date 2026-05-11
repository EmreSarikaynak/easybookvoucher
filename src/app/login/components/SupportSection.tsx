'use client';

import React from 'react';
import { Mail, Phone, MessageCircle } from 'lucide-react';

export const SupportSection: React.FC = () => {
    const whatsappNumber = '905366029397';
    const whatsappLink = `https://wa.me/${whatsappNumber}`;

    return (
        <div
            className="w-full max-w-md mx-auto mt-6 p-5 bg-white rounded-2xl animate-fade-in"
            style={{
                boxShadow: 'var(--shadow-md)',
            }}
        >
            <h3
                className="text-base font-semibold text-center mb-4"
                style={{
                    color: 'rgb(var(--color-gray-900))',
                    fontFamily: 'var(--font-family)',
                }}
            >
                Sorun mu var? Destek ile iletişim
            </h3>

            <div className="flex flex-col gap-3">
                {/* Email */}
                <a
                    href="mailto:peterpan4865@gmail.com"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors touch-manipulation min-h-[44px]"
                >
                    <Mail className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-primary))' }} />
                    <span
                        className="text-sm"
                        style={{
                            color: 'rgb(var(--color-gray-700))',
                            fontFamily: 'var(--font-family)',
                        }}
                    >
                        peterpan4865@gmail.com
                    </span>
                </a>

                {/* Phone */}
                <a
                    href="tel:+905366029397"
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors touch-manipulation min-h-[44px]"
                >
                    <Phone className="w-5 h-5 flex-shrink-0" style={{ color: 'rgb(var(--color-primary))' }} />
                    <span
                        className="text-sm"
                        style={{
                            color: 'rgb(var(--color-gray-700))',
                            fontFamily: 'var(--font-family)',
                        }}
                    >
                        +90 536 602 93 97
                    </span>
                </a>

                {/* WhatsApp Button */}
                <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 p-3 rounded-lg hover:opacity-90 transition-opacity touch-manipulation min-h-[44px] mt-2"
                    style={{
                        backgroundColor: '#25D366',
                        color: 'white',
                    }}
                >
                    <MessageCircle className="w-5 h-5" />
                    <span className="font-medium text-sm">WhatsApp ile İletişim</span>
                </a>
            </div>
        </div>
    );
};
