import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Profile } from "@/lib/types";

export async function getCurrentUser(): Promise<Profile | null> {
    const supabase = await createServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return null;
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("*, agency:agencies(*)")
        .eq("id", user.id)
        .single();

    return profile;
}

export function isAdmin(profile: Profile | null): boolean {
    return profile?.role === "super_admin" || profile?.role === "admin";
}

export function isAgencyUser(profile: Profile | null): boolean {
    return profile?.role === "agency_admin" || profile?.role === "sales";
}

export function canManageTours(profile: Profile | null): boolean {
    return isAdmin(profile);
}

export function canViewTours(profile: Profile | null): boolean {
    if (!profile) return false;
    if (isAdmin(profile)) return true;
    return (
        (profile.role === "agency_admin" || profile.role === "sales") &&
        !!profile.agency_id
    );
}
