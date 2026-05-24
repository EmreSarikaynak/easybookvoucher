import { notFound } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { getTourContentForLang } from "@/lib/tour-i18n";
import {
  fetchAgencyTourPriceMap,
  type ResolvedTourPriceSet,
} from "@/lib/tour-catalog-data";
import { TourPublicClient } from "./tour-public-client";
import type { Tour } from "@/lib/types";
import type { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ a?: string }>;
}

async function getPublicTour(id: string): Promise<Tour | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("tours")
    .select("*")
    .eq("id", id)
    .eq("is_active", true)
    .single();

  if (error || !data) return null;
  return data as Tour;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const tour = await getPublicTour(id);
  if (!tour) return { title: "Tur Bulunamadı" };

  const content = getTourContentForLang(tour.translations, "tr", tour.name, tour.description);
  return {
    title: `${content.name} | Easy Book Tours`,
    description: content.description?.slice(0, 160) || undefined,
    openGraph: {
      title: content.name,
      images: tour.images?.[0] ? [{ url: tour.images[0] }] : undefined,
    },
  };
}

export default async function PublicTourPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { a: agencyCode } = await searchParams;
  const tour = await getPublicTour(id);

  if (!tour) notFound();

  let prices: ResolvedTourPriceSet | null = null;
  let agencyName: string | null = null;
  let resolvedAgencyCode: string | null = null;

  if (agencyCode) {
    const supabase = await createServerSupabaseClient();
    const { data: agency } = await supabase
      .from("agencies")
      .select("id, name")
      .eq("agency_code", agencyCode)
      .eq("is_active", true)
      .maybeSingle();

    if (agency) {
      agencyName = agency.name;
      resolvedAgencyCode = agencyCode;
      const priceMap = await fetchAgencyTourPriceMap(supabase, agency.id, [tour]);
      prices = priceMap.get(tour.id) ?? null;
    }
  }

  return (
    <TourPublicClient
      tour={tour}
      prices={prices}
      agencyName={agencyName}
      agencyCode={resolvedAgencyCode}
    />
  );
}
