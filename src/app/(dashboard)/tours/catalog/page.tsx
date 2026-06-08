import { redirect } from "next/navigation";
import { getCatalogPageData, type CatalogCurrency } from "@/app/actions/tour-catalog";
import { TourCatalogClient } from "@/components/tour/tour-catalog-client";
import { getCurrentUser, canViewTours } from "@/lib/auth-helpers";

interface PageProps {
  searchParams: Promise<{ agencyId?: string; currency?: string }>;
}

export default async function TourCatalogPage({ searchParams }: PageProps) {
  const profile = await getCurrentUser();
  if (!profile || !canViewTours(profile)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const currency: CatalogCurrency = params.currency === "TRY" ? "TRY" : "EUR";
  const { data, error } = await getCatalogPageData(
    params.agencyId ?? null,
    currency
  );

  if (error || !data) {
    return (
      <div className="p-6 text-destructive">
        {error ?? "Katalog yüklenemedi"}
      </div>
    );
  }

  return <TourCatalogClient initialData={data} />;
}
