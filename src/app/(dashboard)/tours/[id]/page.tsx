import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { canManageTours, canViewTours } from "@/lib/auth-helpers";
import { TourDetailClient } from "./tour-detail-client";
import { fetchAgencyTourPriceMap } from "@/lib/tour-catalog-data";
import type { Tour } from "@/lib/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TourDetailPage({ params }: PageProps) {
  const { id } = await params;
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
  let agencyCode: string | null = null;
  if (profile?.agency_id) {
    const { data: agency } = await supabase
      .from("agencies")
      .select("agency_code")
      .eq("id", profile.agency_id)
      .maybeSingle();
    agencyCode = agency?.agency_code ?? null;
  }

  const { data: tour, error } = await supabase.from("tours").select("*").eq("id", id).single();

  if (error || !tour) notFound();

  if (!isAdmin && !tour.is_active) {
    redirect("/tours");
  }

  const priceMap = await fetchAgencyTourPriceMap(
    supabase,
    profile?.agency_id ?? null,
    [tour as Tour]
  );
  const prices = priceMap.get((tour as Tour).id) ?? null;

  return (
    <TourDetailClient
      tour={tour as Tour}
      isAdmin={isAdmin}
      prices={prices}
      agencyCode={agencyCode}
    />
  );
}
