import type { CurrencyType } from "@/lib/types";
import { convertPrice } from "@/lib/currency-converter";
import {
  loadExchangeRatePairsForCalculation,
  type RatePair,
} from "@/lib/exchange-rates";

/**
 * Bir tutarın EUR snapshot'ı. Voucher / agent_payment satırına yazılır
 * ve sonradan kurlar değişse bile değiştirilmez — cari hesap dengesinin
 * zaman içinde kaymamasını sağlar.
 */
export interface EurSnapshot {
  /** 1 birim source currency = `rate` EUR. EUR→EUR için 1. */
  rate: number;
  /** exchange_rates.effective_date ile aynı format: YYYY-MM-DD. */
  rateDate: string;
  /** amount * rate, 2 ondalığa yuvarlanmış. */
  amountEur: number;
}

/** Bir tarih için 1 birim `currency` = ? EUR. EUR→EUR = 1. */
export function computeEurRate(
  currency: CurrencyType,
  rates: RatePair[]
): number | null {
  if (currency === "EUR") return 1;

  // Direct: X → EUR
  const direct = rates.find(
    (r) => r.from_currency === currency && r.to_currency === "EUR"
  );
  if (direct && direct.rate > 0) return direct.rate;

  // Inverse: EUR → X (1 X = 1/rate EUR)
  const inverse = rates.find(
    (r) => r.from_currency === "EUR" && r.to_currency === currency
  );
  if (inverse && inverse.rate > 0) return 1 / inverse.rate;

  // Cross via convertPrice (TRY köprüsü vs.)
  const crossed = convertPrice(1, currency, "EUR", rates);
  if (crossed > 0 && crossed !== 1) return crossed;

  return null;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const toIsoDate = (d: Date): string => {
  // YYYY-MM-DD, UTC bazlı — DB tarafıyla tutarlı kalsın
  return d.toISOString().split("T")[0];
};

/**
 * Tek bir tutarı EUR snapshot'ına çevirir.
 *
 * Rate bulunamazsa null döner — caller "kur henüz yüklenmemiş, voucher
 * oluşturulamaz" şeklinde hata gösterebilir VEYA EUR ise direkt fallback
 * yapabilir (bu fonksiyon EUR için 1 döndüreceği için zaten patlamaz).
 */
export async function snapshotToEur(
  amount: number,
  currency: CurrencyType,
  onDate: Date = new Date()
): Promise<EurSnapshot | null> {
  const rateDate = toIsoDate(onDate);
  const { pairs } = await loadExchangeRatePairsForCalculation(rateDate);
  const rate = computeEurRate(currency, pairs);
  if (rate == null) return null;
  return {
    rate,
    rateDate,
    amountEur: round2(amount * rate),
  };
}

/**
 * Birden fazla tutarı tek DB round-trip'i ile EUR'a snapshot'lar. Aynı
 * tarih + aynı currency varsayımıyla — voucher kayıt sırasında total_price,
 * deposit_paid, easybook_cost gibi alanları beraber çevirmek için.
 */
export async function snapshotManyToEur(
  amounts: number[],
  currency: CurrencyType,
  onDate: Date = new Date()
): Promise<{
  rate: number;
  rateDate: string;
  amountsEur: number[];
} | null> {
  const rateDate = toIsoDate(onDate);
  const { pairs } = await loadExchangeRatePairsForCalculation(rateDate);
  const rate = computeEurRate(currency, pairs);
  if (rate == null) return null;
  return {
    rate,
    rateDate,
    amountsEur: amounts.map((n) => round2(n * rate)),
  };
}

/**
 * Pre-computed rate + tutar listesinden EUR snapshot'ı türetir.
 * Update path'lerinde, mevcut eur_rate_snapshot'ı yeniden hesaplamadan
 * yeni tutarları o kurla EUR'a çevirmek için kullanılır.
 */
export function applyExistingEurRate(
  amounts: number[],
  existingRate: number
): number[] {
  return amounts.map((n) => round2(n * existingRate));
}
