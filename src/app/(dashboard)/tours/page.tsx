import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { canManageTours, canViewTours } from "@/lib/auth-helpers";
import { ToursContent } from "@/components/tour/tours-content";
import {
  fetchAgencyTourPriceMap,
  type ResolvedTourPriceSet,
} from "@/lib/tour-catalog-data";
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
    .select("*")
    .eq("id", user.id)
    .single();

  if (!canViewTours(profile)) {
    redirect("/dashboard");
  }

  const isAdmin = canManageTours(profile);
  const tours = await getTours(isAdmin);
  let agencyCode: string | null = null;
  if (profile?.agency_id) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("agency_code")
      .eq("id", profile.agency_id)
      .maybeSingle();
    agencyCode = agency?.agency_code ?? null;
  }
  const priceMap = await fetchAgencyTourPriceMap(
    supabase,
    profile?.agency_id ?? null,
    tours
  );
  const priceRecord: Record<string, ResolvedTourPriceSet> = {};
  priceMap.forEach((v, k) => {
    priceRecord[k] = v;
  });

  return (
    <ToursContent
      initialTours={tours}
      isAdmin={isAdmin}
      priceMap={priceRecord}
      agencyCode={agencyCode}
    />
  );
}
