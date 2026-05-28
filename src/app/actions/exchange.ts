"use server";

import { revalidatePath } from "next/cache";
import { createServiceRoleClient } from "@/lib/supabase-server";
import { getCurrentUser, isAdmin } from "@/lib/auth-helpers";
import { fetchTcmbRatesRaw, syncTcmbRatesToDatabase } from "@/lib/exchange-rates";

export async function fetchTcmbRates() {
    const result = await fetchTcmbRatesRaw();
    if (!result.success) {
        return { success: false as const, error: result.error ?? "Merkez Bankası verileri alınamadı." };
    }
    return {
        success: true as const,
        data: result.data,
        lastUpdate: result.lastUpdate,
    };
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
    const supabase = await createServerSupabaseClient();

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
    const supabase = await createServerSupabaseClient();

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

/** Admin: TCMB'den çekip veritabanına kaydet (sayfa üzerinden manuel). */
export async function syncExchangeRatesFromTcmb(): Promise<{
    success: boolean;
    effectiveDate?: string;
    pairCount?: number;
    error?: string;
}> {
    const profile = await getCurrentUser();
    if (!isAdmin(profile)) {
        return { success: false, error: "Yetkisiz" };
    }

    try {
        const supabase = createServiceRoleClient();
        const result = await syncTcmbRatesToDatabase(supabase);
        if (result.success) {
            revalidatePath("/exchange-rates");
            revalidatePath("/dashboard");
            revalidatePath("/settings");
        }
        return result;
    } catch (e) {
        return {
            success: false,
            error: e instanceof Error ? e.message : "Senkron başarısız",
        };
    }
}
