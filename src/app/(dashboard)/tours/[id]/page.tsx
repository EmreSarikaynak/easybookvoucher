import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { canManageTours, canViewTours } from "@/lib/auth-helpers";
import { TourDetailClient } from "./tour-detail-client";
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
    .select("role, agency_id")
    .eq("id", user.id)
    .single();

  if (!canViewTours(profile)) {
    redirect("/dashboard");
  }

  const isAdmin = canManageTours(profile);

  const { data: tour, error } = await supabase.from("tours").select("*").eq("id", id).single();

  if (error || !tour) notFound();

  if (!isAdmin && !tour.is_active) {
    redirect("/tours");
  }

  return <TourDetailClient tour={tour as Tour} isAdmin={isAdmin} />;
}
