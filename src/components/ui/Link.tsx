'use client';

import React from 'react';
import Link from 'next/link';

export interface LinkComponentProps {
    href: string;
    children: React.ReactNode;
    external?: boolean;
    className?: string;
}

export const LinkComponent: React.FC<LinkComponentProps> = ({
    href,
    children,
    external = false,
    className = '',
}) => {
    const linkClasses = `
    inline-block text-sm font-medium
    transition-all duration-200
    hover:underline
    min-h-[44px] flex items-center
    touch-manipulation
    ${className}
  `;

    const linkStyle = {
        color: 'rgb(var(--color-primary))',
        fontFamily: 'var(--font-family)',
    };

    if (external || href.startsWith('http') || href.startsWith('mailto') || href.startsWith('tel')) {
        return (
            <a
                href={href}
                target={external || href.startsWith('http') ? '_blank' : undefined}
                rel={external || href.startsWith('http') ? 'noopener noreferrer' : undefined}
                className={linkClasses}
                style={linkStyle}
            >
                {children}
            </a>
        );
    }

    return (
        <Link href={href} className={linkClasses} style={linkStyle}>
            {children}
        </Link>
    );
};
