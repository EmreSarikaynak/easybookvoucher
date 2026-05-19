import { createServerSupabaseClient } from "@/lib/supabase-server";
import { ToursContent } from "@/components/tour/tours-content";
import type { Tour } from "@/lib/types";

async function getTours(): Promise<Tour[]> {
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("tours")
    .select("*")
    .order("name");

  if (error) {
    console.error("Tours fetch error:", error);
    return [];
  }

  return data ?? [];
}

async function getToursPageData() {
  const supabase = await createServerSupabaseClient();

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { userRole: null, userAgencyId: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .single();

  return {
    userRole: profile?.role ?? null,
    userAgencyId: profile?.agency_id ?? null,
  };
}

export default async function ToursPage() {
  const [tours, { userRole, userAgencyId }] = await Promise.all([
    getTours(),
    getToursPageData(),
  ]);

  const isAdmin = userRole === "super_admin" || userRole === "admin";

  return (
    <ToursContent
      initialTours={tours}
      isAdmin={isAdmin}
      userAgencyId={userAgencyId}
    />
  );
}
