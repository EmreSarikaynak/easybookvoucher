import { CurrencyType } from "@/lib/types";

interface ExchangeRate {
    from_currency: CurrencyType;
    to_currency: CurrencyType;
    rate: number;
}

// Helper function to convert price between currencies
export function convertPrice(
    amount: number,
    fromCurrency: CurrencyType,
    toCurrency: CurrencyType,
    exchangeRates: ExchangeRate[]
): number {
    if (fromCurrency === toCurrency) {
        return amount;
    }

    // Find direct rate
    const directRate = exchangeRates.find(
        (rate) =>
            rate.from_currency === fromCurrency && rate.to_currency === toCurrency
    );

    if (directRate) {
        return amount * directRate.rate;
    }

    // Find inverse rate
    const inverseRate = exchangeRates.find(
        (rate) =>
            rate.from_currency === toCurrency && rate.to_currency === fromCurrency
    );

    if (inverseRate) {
        return amount / inverseRate.rate;
    }

    // If no direct or inverse rate, try converting through EUR
    if (fromCurrency !== "EUR" && toCurrency !== "EUR") {
        const toEUR = exchangeRates.find(
            (rate) => rate.from_currency === fromCurrency && rate.to_currency === "EUR"
        );
        const fromEUR = exchangeRates.find(
            (rate) => rate.from_currency === "EUR" && rate.to_currency === toCurrency
        );

        if (toEUR && fromEUR) {
            return amount * toEUR.rate * fromEUR.rate;
        }
    }

    // If still not found, return original amount
    console.warn(
        `Exchange rate not found for ${fromCurrency} to ${toCurrency}`
    );
    return amount;
}

export function formatCurrency(amount: number, currency: CurrencyType): string {
    const symbols: Record<CurrencyType, string> = {
        TRY: "₺",
        EUR: "€",
        USD: "$",
        GBP: "£",
    };

    return `${symbols[currency]}${amount.toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}
