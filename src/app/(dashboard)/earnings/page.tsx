import { fetchEarningsReport } from "@/app/actions/earnings";
import { EarningsClient } from "./earnings-client";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<{ start?: string; end?: string; agency?: string }>;
}

function defaultStart(): string {
  const d = new Date();
  d.setDate(1);
  return d.toISOString().slice(0, 10);
}
function defaultEnd(): string {
  return new Date().toISOString().slice(0, 10);
}

export default async function EarningsPage({ searchParams }: PageProps) {
  const sp = await searchParams;
  const startDate = sp.start || defaultStart();
  const endDate = sp.end || defaultEnd();
  const agencyId = sp.agency || null;

  const { data, error } = await fetchEarningsReport({
    startDate,
    endDate,
    agencyId,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kazançlar &amp; Borç Takibi</h1>
        <p className="text-muted-foreground text-sm">
          Acente kazancı, EasyBook&apos;a olan borç ve müşteriden tahsil edilen depozit özeti.
        </p>
      </div>

      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && <EarningsClient initialReport={data} />}
    </div>
  );
}
