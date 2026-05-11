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
    // Remove all non-digit characters except + at start
    let cleaned = phone.replace(/[^\d+]/g, '');

    // Remove + if it's not at the start
    if (cleaned.indexOf('+') > 0) {
        cleaned = cleaned.replace(/\+/g, '');
    }

    // If starts with 0, remove it
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }

    // If starts with 90, add +
    if (cleaned.startsWith('90')) {
        cleaned = '+' + cleaned;
    }

    // If starts with 5 (no country code), add +90
    if (cleaned.startsWith('5') && !cleaned.startsWith('+90')) {
        cleaned = '+90' + cleaned;
    }

    // Format: +90 5XX XXX XX XX
    if (cleaned.startsWith('+90')) {
        const digits = cleaned.substring(3); // Remove +90
        let formatted = '+90';

        if (digits.length > 0) {
            formatted += ' ' + digits.substring(0, 3); // 5XX
        }
        if (digits.length > 3) {
            formatted += ' ' + digits.substring(3, 6); // XXX
        }
        if (digits.length > 6) {
            formatted += ' ' + digits.substring(6, 8); // XX
        }
        if (digits.length > 8) {
            formatted += ' ' + digits.substring(8, 10); // XX
        }

        return formatted;
    }

    return cleaned;
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
