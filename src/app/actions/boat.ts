"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { Boat, BoatStatus } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function getBoats(filters?: {
    status?: BoatStatus;
    search?: string;
}): Promise<{ data: Boat[] | null; error: string | null }> {
    const supabase = await createServerSupabaseClient();

    try {
        let query = supabase
            .from("boats")
            .select("*")
            .order("name", { ascending: true });

        if (filters?.status) {
            query = query.eq("status", filters.status);
        }

        if (filters?.search) {
            query = query.ilike("name", `%${filters.search}%`);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching boats:", error);
            return { data: null, error: error.message };
        }

        return { data: data as Boat[], error: null };
    } catch (error) {
        console.error("Unexpected error fetching boats:", error);
        return { data: null, error: "Tekneler yüklenirken hata oluştu" };
    }
}

export async function getBoatById(
    id: string
): Promise<{ data: Boat | null; error: string | null }> {
    const supabase = await createServerSupabaseClient();

    try {
        const { data, error } = await supabase
            .from("boats")
            .select("*")
            .eq("id", id)
            .single();

        if (error) {
            console.error("Error fetching boat:", error);
            return { data: null, error: error.message };
        }

        return { data: data as Boat, error: null };
    } catch (error) {
        console.error("Unexpected error fetching boat:", error);
        return { data: null, error: "Tekne bilgileri yüklenirken hata oluştu" };
    }
}

export async function createBoat(
    boat: Omit<Boat, "id" | "created_at" | "updated_at">
): Promise<{ data: Boat | null; error: string | null }> {
    const supabase = await createServerSupabaseClient();

    try {
        const { data, error } = await supabase
            .from("boats")
            .insert([boat])
            .select()
            .single();

        if (error) {
            console.error("Error creating boat:", error);
            return { data: null, error: error.message };
        }

        revalidatePath("/fleet");
        revalidatePath("/operations");

        return { data: data as Boat, error: null };
    } catch (error) {
        console.error("Unexpected error creating boat:", error);
        return { data: null, error: "Tekne eklenirken hata oluştu" };
    }
}

export async function updateBoat(
    id: string,
    updates: Partial<Omit<Boat, "id" | "created_at" | "updated_at">>
): Promise<{ data: Boat | null; error: string | null }> {
    const supabase = await createServerSupabaseClient();

    try {
        const { data, error } = await supabase
            .from("boats")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Error updating boat:", error);
            return { data: null, error: error.message };
        }

        revalidatePath("/fleet");
        revalidatePath("/operations");
        revalidatePath(`/fleet/${id}`);

        return { data: data as Boat, error: null };
    } catch (error) {
        console.error("Unexpected error updating boat:", error);
        return { data: null, error: "Tekne güncellenirken hata oluştu" };
    }
}

export async function deleteBoat(
    id: string
): Promise<{ success: boolean; error: string | null }> {
    const supabase = await createServerSupabaseClient();

    try {
        const { error } = await supabase.from("boats").delete().eq("id", id);

        if (error) {
            console.error("Error deleting boat:", error);
            return { success: false, error: error.message };
        }

        revalidatePath("/fleet");
        revalidatePath("/operations");

        return { success: true, error: null };
    } catch (error) {
        console.error("Unexpected error deleting boat:", error);
        return { success: false, error: "Tekne silinirken hata oluştu" };
    }
}

export async function getBoatsByAvailability(
    date: string,
    filters?: {
        minCapacity?: number;
        maxPrice?: number;
        currency?: string;
    }
): Promise<{ data: Boat[] | null; error: string | null }> {
    const supabase = await createServerSupabaseClient();

    try {
        // Get boats that are available on the specified date
        const { data: occupancyData, error: occupancyError } = await supabase
            .from("occupancy_calendar")
            .select("boat_id, boats(*)")
            .eq("date", date)
            .eq("status", "available");

        if (occupancyError) {
            console.error("Error fetching availability:", occupancyError);
            return { data: null, error: occupancyError.message };
        }

        let availableBoats = occupancyData
            ?.map((item: any) => item.boats)
            .filter((boat: any) => boat && boat.status === "active") as Boat[];

        // Apply filters
        if (filters?.minCapacity) {
            availableBoats = availableBoats?.filter(
                (boat) => boat.specifications.capacity_max >= filters.minCapacity!
            );
        }

        if (filters?.maxPrice && filters?.currency) {
            availableBoats = availableBoats?.filter(
                (boat) =>
                    boat.currency === filters.currency && boat.base_price <= filters.maxPrice!
            );
        }

        return { data: availableBoats || [], error: null };
    } catch (error) {
        console.error("Unexpected error fetching available boats:", error);
        return { data: null, error: "Müsait tekneler yüklenirken hata oluştu" };
    }
}
