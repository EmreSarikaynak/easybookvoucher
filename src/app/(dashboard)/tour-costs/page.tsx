import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { Tour } from "@/lib/types";
import { CURRENCY_SYMBOLS } from "@/lib/types";

async function getActiveTours(): Promise<Tour[]> {
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("tours")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) {
    console.error("Tours fetch error:", error);
    return [];
  }

  return data ?? [];
}

export default async function TourCostsPage() {
  const tours = await getActiveTours();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tur Maliyetleri</h1>
        <p className="text-muted-foreground text-sm mt-1">
          EasyBook tur taban fiyatları (sadece okuma)
        </p>
      </div>

      <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
        {/* Desktop table */}
        <div className="hidden sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left py-3 px-4 font-semibold">Tur Adı</th>
                <th className="text-right py-3 px-4 font-semibold">EUR Fiyat (Yet/Çoc)</th>
                <th className="text-right py-3 px-4 font-semibold">TL Fiyat (Yet/Çoc)</th>
              </tr>
            </thead>
            <tbody>
              {tours.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-8 text-center text-muted-foreground">
                    Henüz aktif tur bulunmuyor
                  </td>
                </tr>
              ) : (
                tours.map((tour) => (
                  <tr key={tour.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4 font-medium">{tour.name}</td>
                    <td className="py-3 px-4 text-right font-mono font-semibold text-blue-700">
                      <div className="flex flex-col gap-1 items-end">
                        <span>{(tour.base_price_adult_eur ?? 0).toFixed(2)} € <span className="text-[10px] text-muted-foreground font-sans font-normal">(Yet)</span></span>
                        <span className="text-blue-500/80">{(tour.base_price_child_eur ?? 0).toFixed(2)} € <span className="text-[10px] text-muted-foreground font-sans font-normal">(Çoc)</span></span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-muted-foreground">
                      <div className="flex flex-col gap-1 items-end">
                        <span>{(tour.base_price_adult_try ?? 0).toFixed(2)} ₺ <span className="text-[10px] font-sans font-normal">(Yet)</span></span>
                        <span className="text-muted-foreground/60">{(tour.base_price_child_try ?? 0).toFixed(2)} ₺ <span className="text-[10px] font-sans font-normal">(Çoc)</span></span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y">
          {tours.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Henüz aktif tur bulunmuyor
            </div>
          ) : (
            tours.map((tour) => (
              <div key={tour.id} className="p-4 space-y-2">
                <div className="font-medium text-sm">{tour.name}</div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">EUR (Yet/Çoc)</span>
                  <div className="flex items-center gap-2 font-mono font-semibold text-blue-700">
                    <span>{(tour.base_price_adult_eur ?? 0).toFixed(2)} €</span>
                    <span className="text-muted-foreground font-sans font-normal text-xs">/</span>
                    <span className="text-blue-500/80">{(tour.base_price_child_eur ?? 0).toFixed(2)} €</span>
                  </div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">TL (Yet/Çoc)</span>
                  <div className="flex items-center gap-2 font-mono text-muted-foreground">
                    <span>{(tour.base_price_adult_try ?? 0).toFixed(2)} ₺</span>
                    <span className="font-sans font-normal text-xs">/</span>
                    <span className="text-muted-foreground/60">{(tour.base_price_child_try ?? 0).toFixed(2)} ₺</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
