import { notFound, redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
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

  const isAdmin = profile?.role === "super_admin" || profile?.role === "admin";

  const { data: tour, error } = await supabase.from("tours").select("*").eq("id", id).single();

  if (error || !tour) notFound();

  if (!isAdmin && profile?.role !== "agency_admin") {
    redirect("/tours");
  }

  return (
    <TourDetailClient
      tour={tour as Tour}
      isAdmin={isAdmin}
      userAgencyId={profile?.agency_id ?? null}
    />
  );
}
