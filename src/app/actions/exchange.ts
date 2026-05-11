"use server";

import { revalidatePath } from "next/cache";

interface TcmbRate {
    code: string;
    buying: number;
    selling: number;
}

export async function fetchTcmbRates() {
    try {
        const response = await fetch("https://www.tcmb.gov.tr/kurlar/today.xml", {
            next: { revalidate: 3600 }, // Cache for 1 hour
        });

        if (!response.ok) {
            throw new Error("TCMB erişim hatası");
        }

        const xmlText = await response.text();

        // Simple regex parsing to avoid heavy xml libraries
        // We look for <Currency CurrencyCode="USD"> ... <ForexBuying>30.50</ForexBuying>

        const extractRate = (code: string) => {
            const currencyBlockRegex = new RegExp(`<Currency CrossOrder="[^"]*" Kod="${code}" CurrencyCode="${code}">([\\s\\S]*?)<\\/Currency>`, "i");
            const match = xmlText.match(currencyBlockRegex);
            if (!match) return null;

            const block = match[1];
            const buyingMatch = block.match(/<ForexBuying>([0-9.]+)<\/ForexBuying>/);
            const sellingMatch = block.match(/<ForexSelling>([0-9.]+)<\/ForexSelling>/);

            if (buyingMatch && sellingMatch) {
                return {
                    code,
                    buying: parseFloat(buyingMatch[1]),
                    selling: parseFloat(sellingMatch[1])
                };
            }
            return null;
        };

        const usd = extractRate("USD");
        const eur = extractRate("EUR");
        const gbp = extractRate("GBP");

        return {
            success: true,
            data: {
                USD: usd,
                EUR: eur,
                GBP: gbp
            },
            lastUpdate: new Date().toISOString()
        };

    } catch (error) {
        console.error("TCMB fetch error:", error);
        return { success: false, error: "Merkez Bankası verileri alınamadı." };
    }
}

/**
 * Get exchange rate for a specific date
 * If no exact date match, returns the most recent rate before that date
 */
export async function getExchangeRateForDate(
    fromCurrency: string,
    toCurrency: string,
    date: string
) {
    const { createServerSupabaseClient } = await import("@/lib/supabase-server");
    const supabase = createServerSupabaseClient();

    try {
        const { data, error } = await supabase
            .from("exchange_rates")
            .select("rate")
            .eq("from_currency", fromCurrency)
            .eq("to_currency", toCurrency)
            .lte("effective_date", date)
            .order("effective_date", { ascending: false })
            .limit(1)
            .single();

        if (error) {
            console.error("Exchange rate query error:", error);
            return null;
        }

        return data?.rate ?? null;
    } catch (error) {
        console.error("Error fetching exchange rate:", error);
        return null;
    }
}

/**
 * Get all exchange rates for a specific date
 * Returns a map of all currency conversions
 */
export async function getAllExchangeRatesForDate(date: string) {
    const { createServerSupabaseClient } = await import("@/lib/supabase-server");
    const supabase = createServerSupabaseClient();

    try {
        // Get all unique currency pairs
        const { data: allRates, error } = await supabase
            .from("exchange_rates")
            .select("*")
            .lte("effective_date", date)
            .order("effective_date", { ascending: false });

        if (error) throw error;

        // Get the most recent rate for each currency pair
        const ratesMap: Record<string, Record<string, number>> = {};
        const seenPairs = new Set<string>();

        allRates?.forEach((rate: any) => {
            const pairKey = `${rate.from_currency}-${rate.to_currency}`;
            if (!seenPairs.has(pairKey)) {
                seenPairs.add(pairKey);
                if (!ratesMap[rate.from_currency]) {
                    ratesMap[rate.from_currency] = {};
                }
                ratesMap[rate.from_currency][rate.to_currency] = rate.rate;
            }
        });

        return {
            success: true,
            data: {
                date,
                rates: ratesMap
            }
        };
    } catch (error) {
        console.error("Error fetching all exchange rates:", error);
        return { success: false, error: "Kur bilgileri alınamadı." };
    }
}
