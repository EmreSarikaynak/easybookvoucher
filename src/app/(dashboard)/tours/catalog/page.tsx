import { redirect } from "next/navigation";
import { getCatalogPageData } from "@/app/actions/tour-catalog";
import { TourCatalogClient } from "@/components/tour/tour-catalog-client";
import { getCurrentUser, canViewTours } from "@/lib/auth-helpers";

interface PageProps {
  searchParams: Promise<{ agencyId?: string }>;
}

export default async function TourCatalogPage({ searchParams }: PageProps) {
  const profile = await getCurrentUser();
  if (!profile || !canViewTours(profile)) {
    redirect("/dashboard");
  }

  const params = await searchParams;
  const { data, error } = await getCatalogPageData(params.agencyId ?? null);

  if (error || !data) {
    return (
      <div className="p-6 text-destructive">
        {error ?? "Katalog yüklenemedi"}
      </div>
    );
  }

  return <TourCatalogClient initialData={data} />;
}
