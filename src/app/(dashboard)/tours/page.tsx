import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { canManageTours, canViewTours } from "@/lib/auth-helpers";
import { ToursContent } from "@/components/tour/tours-content";
import type { Tour } from "@/lib/types";

async function getTours(isAdmin: boolean): Promise<Tour[]> {
  const supabase = await createServerSupabaseClient();

  let query = supabase.from("tours").select("*").order("name");
  if (!isAdmin) {
    query = query.eq("is_active", true);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Tours fetch error:", error);
    return [];
  }

  return data ?? [];
}

export default async function ToursPage() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, agency_id")
    .eq("id", user.id)
    .single();

  if (!canViewTours(profile)) {
    redirect("/dashboard");
  }

  const isAdmin = canManageTours(profile);
  const tours = await getTours(isAdmin);

  return <ToursContent initialTours={tours} isAdmin={isAdmin} />;
}
