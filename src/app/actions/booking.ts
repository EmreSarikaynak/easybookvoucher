"use server";

import { createServerSupabaseClient } from "@/lib/supabase-server";
import { BoatBooking, OccupancyStatus } from "@/lib/types";
import { revalidatePath } from "next/cache";

export async function getBookings(filters?: {
    boatId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
}): Promise<{ data: BoatBooking[] | null; error: string | null }> {
    const supabase = createServerSupabaseClient();

    try {
        let query = supabase
            .from("boat_bookings")
            .select("*, boat:boats(*), agency:agencies(*), sales_person:profiles(*)")
            .order("booking_date", { ascending: false });

        if (filters?.boatId) {
            query = query.eq("boat_id", filters.boatId);
        }

        if (filters?.startDate) {
            query = query.gte("booking_date", filters.startDate);
        }

        if (filters?.endDate) {
            query = query.lte("booking_date", filters.endDate);
        }

        if (filters?.status) {
            query = query.eq("status", filters.status);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching bookings:", error);
            return { data: null, error: error.message };
        }

        return { data: data as BoatBooking[], error: null };
    } catch (error) {
        console.error("Unexpected error fetching bookings:", error);
        return { data: null, error: "Rezervasyonlar yüklenirken hata oluştu" };
    }
}

export async function getBookingById(
    id: string
): Promise<{ data: BoatBooking | null; error: string | null }> {
    const supabase = createServerSupabaseClient();

    try {
        const { data, error } = await supabase
            .from("boat_bookings")
            .select("*, boat:boats(*), agency:agencies(*), sales_person:profiles(*)")
            .eq("id", id)
            .single();

        if (error) {
            console.error("Error fetching booking:", error);
            return { data: null, error: error.message };
        }

        return { data: data as BoatBooking, error: null };
    } catch (error) {
        console.error("Unexpected error fetching booking:", error);
        return { data: null, error: "Rezervasyon yüklenirken hata oluştu" };
    }
}

export async function checkAvailability(
    boatId: string,
    date: string
): Promise<{ available: boolean; error: string | null }> {
    const supabase = createServerSupabaseClient();

    try {
        const { data, error } = await supabase
            .from("occupancy_calendar")
            .select("status")
            .eq("boat_id", boatId)
            .eq("date", date)
            .single();

        if (error) {
            console.error("Error checking availability:", error);
            return { available: false, error: error.message };
        }

        return { available: data?.status === "available", error: null };
    } catch (error) {
        console.error("Unexpected error checking availability:", error);
        return { available: false, error: "Müsaitlik kontrolü yapılamadı" };
    }
}

export async function createBooking(
    booking: Omit<BoatBooking, "id" | "created_at" | "updated_at">
): Promise<{ data: BoatBooking | null; error: string | null }> {
    const supabase = createServerSupabaseClient();

    try {
        // Check availability first
        const { available, error: availabilityError } = await checkAvailability(
            booking.boat_id,
            booking.booking_date
        );

        if (availabilityError) {
            return { data: null, error: availabilityError };
        }

        if (!available) {
            return {
                data: null,
                error: "Bu tarih için tekne müsait değil",
            };
        }

        // Create booking
        const { data, error } = await supabase
            .from("boat_bookings")
            .insert([booking])
            .select()
            .single();

        if (error) {
            console.error("Error creating booking:", error);
            return { data: null, error: error.message };
        }

        // Update occupancy calendar
        const newStatus: OccupancyStatus =
            booking.payment_details.remaining > 0 ? "pending" : "booked";

        const { error: occupancyError } = await supabase
            .from("occupancy_calendar")
            .update({
                status: newStatus,
                booking_id: data.id,
            })
            .eq("boat_id", booking.boat_id)
            .eq("date", booking.booking_date);

        if (occupancyError) {
            console.error("Error updating occupancy:", occupancyError);
            // Don't return error, booking is created
        }

        revalidatePath("/bookings");
        revalidatePath("/operations");

        return { data: data as BoatBooking, error: null };
    } catch (error) {
        console.error("Unexpected error creating booking:", error);
        return { data: null, error: "Rezervasyon oluşturulurken hata oluştu" };
    }
}

export async function updateBooking(
    id: string,
    updates: Partial<Omit<BoatBooking, "id" | "created_at" | "updated_at">>
): Promise<{ data: BoatBooking | null; error: string | null }> {
    const supabase = createServerSupabaseClient();

    try {
        const { data, error } = await supabase
            .from("boat_bookings")
            .update(updates)
            .eq("id", id)
            .select()
            .single();

        if (error) {
            console.error("Error updating booking:", error);
            return { data: null, error: error.message };
        }

        // If payment details updated, update occupancy status
        if (updates.payment_details) {
            const newStatus: OccupancyStatus =
                updates.payment_details.remaining > 0 ? "pending" : "booked";

            await supabase
                .from("occupancy_calendar")
                .update({ status: newStatus })
                .eq("booking_id", id);
        }

        revalidatePath("/bookings");
        revalidatePath("/operations");
        revalidatePath(`/bookings/${id}`);

        return { data: data as BoatBooking, error: null };
    } catch (error) {
        console.error("Unexpected error updating booking:", error);
        return { data: null, error: "Rezervasyon güncellenirken hata oluştu" };
    }
}

export async function cancelBooking(
    id: string
): Promise<{ success: boolean; error: string | null }> {
    const supabase = createServerSupabaseClient();

    try {
        // Get booking to find associated calendar entry
        const { data: booking, error: fetchError } = await supabase
            .from("boat_bookings")
            .select("boat_id, booking_date")
            .eq("id", id)
            .single();

        if (fetchError) {
            return { success: false, error: fetchError.message };
        }

        // Update booking status
        const { error: updateError } = await supabase
            .from("boat_bookings")
            .update({ status: "cancelled" })
            .eq("id", id);

        if (updateError) {
            console.error("Error cancelling booking:", updateError);
            return { success: false, error: updateError.message };
        }

        // Free up calendar slot
        const { error: occupancyError } = await supabase
            .from("occupancy_calendar")
            .update({
                status: "available",
                booking_id: null,
            })
            .eq("boat_id", booking.boat_id)
            .eq("date", booking.booking_date);

        if (occupancyError) {
            console.error("Error updating occupancy:", occupancyError);
        }

        revalidatePath("/bookings");
        revalidatePath("/operations");

        return { success: true, error: null };
    } catch (error) {
        console.error("Unexpected error cancelling booking:", error);
        return { success: false, error: "Rezervasyon iptal edilirken hata oluştu" };
    }
}
