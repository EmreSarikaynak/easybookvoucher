/**
 * Email validation using regex
 */
export function validateEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
}

/**
 * Turkish phone number validation
 * Accepts formats:
 * - +90 5XX XXX XX XX
 * - 05XXXXXXXXX
 * - 5XXXXXXXXX
 */
export function validatePhone(phone: string): boolean {
    // Remove all spaces, dashes, and parentheses
    const cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // Turkish mobile numbers start with 5 and have 10 digits total
    // With country code: +905XXXXXXXXX or 905XXXXXXXXX
    const phoneRegex = /^(\+?90)?5[0-9]{9}$/;

    return phoneRegex.test(cleaned);
}

/**
 * Auto-format Turkish phone number as user types
 * Returns formatted: +90 5XX XXX XX XX
 */
export function formatPhone(phone: string): string {
    // Sadece rakamları al
    const raw = phone.replace(/\D/g, '');
    if (!raw) return '';

    // Ülke kodu (90) veya şehiriçi sıfırı (0) atıp 10 haneli yerel numarayı bul
    let national = raw;
    if (national.startsWith('90')) {
        national = national.slice(2);
    } else if (national.startsWith('0')) {
        national = national.slice(1);
    }
    national = national.slice(0, 10);

    // Kullanıcı sadece 0 / 90 yazdıysa henüz yerel numara yok — +90 önekini hazır göster
    if (national.length === 0) return '+90 ';

    // +90 5XX XXX XX XX biçiminde göster
    let out = '+90 ' + national.slice(0, 3);
    if (national.length > 3) out += ' ' + national.slice(3, 6);
    if (national.length > 6) out += ' ' + national.slice(6, 8);
    if (national.length > 8) out += ' ' + national.slice(8, 10);
    return out;
}

/**
 * Detect if input is email or phone number
 */
export function detectInputType(input: string): 'email' | 'phone' | 'unknown' {
    const cleaned = input.trim();

    // If contains @, likely email
    if (cleaned.includes('@')) {
        return 'email';
    }

    // If starts with + or is all digits (with optional spaces/dashes), likely phone
    if (cleaned.startsWith('+') || /^[\d\s\-\(\)]+$/.test(cleaned)) {
        return 'phone';
    }

    return 'unknown';
}

/**
 * Validate input - auto-detect type and validate accordingly
 */
export function validateIdentifier(input: string): {
    isValid: boolean;
    type: 'email' | 'phone' | 'unknown';
    message?: string;
} {
    const type = detectInputType(input);

    if (type === 'email') {
        const isValid = validateEmail(input);
        return {
            isValid,
            type,
            message: isValid ? undefined : 'Geçerli bir e-posta adresi girin (örn: ornek@domain.com)',
        };
    }

    if (type === 'phone') {
        const isValid = validatePhone(input);
        return {
            isValid,
            type,
            message: isValid ? undefined : 'Geçerli bir telefon numarası girin (örn: +90 5XX XXX XX XX)',
        };
    }

    return {
        isValid: false,
        type: 'unknown',
        message: 'E-posta adresiniz veya telefon numaranız gereklidir',
    };
}
