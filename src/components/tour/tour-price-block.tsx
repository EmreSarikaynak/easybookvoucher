import type { ResolvedTourPriceSet } from "@/lib/tour-catalog-data";

interface Props {
  prices?: ResolvedTourPriceSet | null;
  size?: "sm" | "md";
  className?: string;
}

export function TourPriceBlock({ prices, size = "sm", className = "" }: Props) {
  if (!prices) {
    return (
      <div className={`text-xs text-muted-foreground ${className}`}>
        Fiyat bilgisi yok
      </div>
    );
  }

  const textSize = size === "md" ? "text-sm" : "text-xs";
  const valueSize = size === "md" ? "text-base" : "text-sm";

  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      <div className="rounded-md border border-blue-200 bg-blue-50/40 px-2.5 py-2">
        <div className={`font-bold uppercase tracking-wider text-blue-700 ${textSize}`}>
          EUR
        </div>
        <div className={`mt-1 font-mono font-semibold text-blue-800 ${valueSize}`}>
          {prices.eur.adult}€
          <span className="text-muted-foreground font-sans font-normal text-[10px] ml-1">
            Yet
          </span>
          <span className="text-muted-foreground mx-1">/</span>
          {prices.eur.child}€
          <span className="text-muted-foreground font-sans font-normal text-[10px] ml-1">
            Çoc
          </span>
        </div>
      </div>
      <div className="rounded-md border border-amber-200 bg-amber-50/40 px-2.5 py-2">
        <div className={`font-bold uppercase tracking-wider text-amber-700 ${textSize}`}>
          TRY
        </div>
        <div className={`mt-1 font-mono font-semibold text-amber-800 ${valueSize}`}>
          {prices.try.adult}₺
          <span className="text-muted-foreground font-sans font-normal text-[10px] ml-1">
            Yet
          </span>
          <span className="text-muted-foreground mx-1">/</span>
          {prices.try.child}₺
          <span className="text-muted-foreground font-sans font-normal text-[10px] ml-1">
            Çoc
          </span>
        </div>
      </div>
    </div>
  );
}
