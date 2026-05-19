/**
 * Multi-language support for voucher tickets
 * Supports English (en) and Turkish (tr)
 */

export type Language = 'en' | 'tr';

export interface VoucherTranslations {
    // Header
    tours: string;
    ticket: string;
    agency: string;

    // Guest Information
    guest: string;
    hotel: string;
    room: string;
    date: string;
    pickup: string;
    departure: string;
    pax: string;

    // Payment Information
    payment: string;
    total: string;
    paid: string;
    remaining: string;

    // Notes
    notes: string;

    // QR Code
    detailedInfo: string;

    // Footer
    since: string;
    tourManager: string;
}

export const translations: Record<Language, VoucherTranslations> = {
    en: {
        // Header
        tours: 'TOURS',
        ticket: 'TICKET',
        agency: 'AGENCY',

        // Guest Information
        guest: 'GUEST',
        hotel: 'HOTEL',
        room: 'ROOM',
        date: 'DATE',
        pickup: 'PICKUP',
        departure: 'DEPARTURE',
        pax: 'PAX',

        // Payment Information
        payment: 'PAYMENT',
        total: 'Total',
        paid: 'Deposit',
        remaining: 'BALANCE',

        // Notes
        notes: 'NOTES',

        // QR Code
        detailedInfo: 'Detailed Info',

        // Footer
        since: 'Easy Book Tours Since 1999',
        tourManager: 'Tour Manager'
    },
    tr: {
        // Header
        tours: 'TOURS',
        ticket: 'TİCKET',
        agency: 'ACENTE',

        // Guest Information
        guest: 'MİSAFİR',
        hotel: 'OTEL',
        room: 'ODA',
        date: 'TARİH',
        pickup: 'ALINIŞ',
        departure: 'HAREKET',
        pax: 'PAX',

        // Payment Information
        payment: 'ÖDEME',
        total: 'Toplam',
        paid: 'Kapora',
        remaining: 'REST',

        // Notes
        notes: 'NOT',

        // QR Code
        detailedInfo: 'Detaylı Bilgi',

        // Footer
        since: 'Easy Book Tours Since 1999',
        tourManager: 'Tur Yöneticisi'
    }
};

/**
 * Get translations for a specific language
 * @param lang - Language code ('en' or 'tr')
 * @returns Translation object
 */
export function getTranslations(lang: Language = 'tr'): VoucherTranslations {
    return translations[lang] || translations.tr;
}

/**
 * Format date according to language
 * @param dateStr - Date string
 * @param lang - Language code
 * @returns Formatted date
 */
export function formatDateByLanguage(dateStr: string, lang: Language = 'tr'): string {
    try {
        const date = new Date(dateStr);

        // Both EN and TR use DD.MM.YYYY format
        // If you want MM/DD/YYYY for English, uncomment below:
        // if (lang === 'en') {
        //   return date.toLocaleDateString('en-US');
        // }

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}.${month}.${year}`;
    } catch {
        return dateStr;
    }
}

/**
 * Format currency according to language
 * @param amount - Amount
 * @param currency - Currency code
 * @param lang - Language code
 * @returns Formatted currency string
 */
export function formatCurrencyByLanguage(
    amount: number,
    currency: string,
    lang: Language = 'tr'
): string {
    const CURRENCY_SYMBOLS: Record<string, string> = {
        'USD': '$',
        'EUR': '€',
        'TRY': '₺',
        'GBP': '£'
    };

    const symbol = CURRENCY_SYMBOLS[currency] || currency;
    const formatted = amount.toFixed(2);

    // English: symbol before amount (no space)
    // Turkish: amount, space, then symbol
    if (lang === 'en') {
        return `${symbol}${formatted}`;
    } else {
        return `${formatted} ${symbol}`;
    }
}
