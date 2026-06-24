"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { OccupancyCalendar, OccupancyStatus } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function getOccupancyMatrix(
    startDate: string,
    endDate: string
): Promise<{ data: OccupancyCalendar[] | null; error: string | null }> {
    const supabase = await createServerSupabaseClient();

    try {
        const { data, error } = await supabase
            .from("occupancy_calendar")
            .select("*, boat:boats(*)")
            .gte("date", startDate)
            .lte("date", endDate)
            .order("date", { ascending: true });

        if (error) {
            console.error("Error fetching occupancy matrix:", error);
            return { data: null, error: error.message };
        }

        return { data: data as OccupancyCalendar[], error: null };
    } catch (error) {
        console.error("Unexpected error fetching occupancy:", error);
        return { data: null, error: "Doluluk takvimi yüklenirken hata oluştu" };
    }
}

export async function updateOccupancy(
    boatId: string,
    date: string,
    status: OccupancyStatus
): Promise<{ success: boolean; error: string | null }> {
    const supabase = await createServerSupabaseClient();

    try {
        const { error } = await supabase
            .from("occupancy_calendar")
            .update({ status })
            .eq("boat_id", boatId)
            .eq("date", date);

        if (error) {
            console.error("Error updating occupancy:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/operations");
        return { success: true, error: null };
    } catch (error) {
        console.error("Unexpected error updating occupancy:", error);
        return { success: false, error: "Doluluk güncellenirken hata oluştu" };
    }
}

export async function blockDates(
    boatId: string,
    startDate: string,
    endDate: string,
    reason?: string
): Promise<{ success: boolean; error: string | null }> {
    const supabase = await createServerSupabaseClient();

    try {
        const { error } = await supabase
            .from("occupancy_calendar")
            .update({
                status: "blocked",
                booking_id: null,
            })
            .eq("boat_id", boatId)
            .gte("date", startDate)
            .lte("date", endDate)
            .eq("status", "available"); // Only block if currently available

        if (error) {
            console.error("Error blocking dates:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/operations");
        return { success: true, error: null };
    } catch (error) {
        console.error("Unexpected error blocking dates:", error);
        return { success: false, error: "Tarihler bloke edilirken hata oluştu" };
    }
}

export async function getAvailableBoatsForDate(
    date: string
): Promise<{ data: any[] | null; error: string | null }> {
    const supabase = await createServerSupabaseClient();

    try {
        const { data, error } = await supabase
            .from("occupancy_calendar")
            .select("boat:boats(*)")
            .eq("date", date)
            .eq("status", "available");

        if (error) {
            console.error("Error fetching available boats:", error);
            return { data: null, error: error.message };
        }

        const boats = data?.map((item: any) => item.boat).filter(Boolean);

        return { data: boats || [], error: null };
    } catch (error) {
        console.error("Unexpected error fetching available boats:", error);
        return { data: null, error: "Müsait tekneler yüklenirken hata oluştu" };
    }
}

export async function generateOccupancyForBoat(
    boatId: string,
    startDate: string,
    endDate: string
): Promise<{ count: number; error: string | null }> {
    const supabase = await createServerSupabaseClient();

    try {
        const { data, error } = await supabase.rpc("generate_occupancy_for_boat", {
            p_boat_id: boatId,
            p_start_date: startDate,
            p_end_date: endDate,
        });

        if (error) {
            console.error("Error generating occupancy:", error);
            return { count: 0, error: error.message };
        }

        revalidatePath("/operations");
        return { count: data || 0, error: null };
    } catch (error) {
        console.error("Unexpected error generating occupancy:", error);
        return { count: 0, error: "Takvim oluşturulurken hata oluştu" };
    }
}
