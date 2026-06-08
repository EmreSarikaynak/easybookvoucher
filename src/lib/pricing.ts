/**
 * Acente maliyet & kazanç hesaplaması — tek kaynak.
 *
 * Fiyat katmanları:
 *  1. EasyBook taban maliyeti: tours.base_price_{adult,child}_{eur,try}
 *  2. Acente maliyet override'ı: agency_tour_prices.cost_{adult,child} (NULL => taban)
 *  3. Acente satış (liste) fiyatı: agency_tour_prices.price_{adult,child} (NULL/0 => taban)
 *  4. Bilete yazılan fiyat: vouchers.total_price (liste fiyatından yüksek olabilir = upsell)
 *
 * Bu modül DB'ye dokunmaz; çağıran taraf currency'e göre doğru _eur/_try
 * taban fiyatını geçirerek currency duyarlılığını sağlar.
 */

/** Para değerlerini 2 ondalığa yuvarlar (kuruş tutarlılığı). */
export function round2(x: number): number {
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

export interface PerPaxCost {
  cost_adult: number;
  cost_child: number;
  /** Yetişkin maliyeti için geçerli bir kaynak (override veya >0 taban) yok. */
  missing_adult: boolean;
  /** Çocuk maliyeti için geçerli bir kaynak yok. */
  missing_child: boolean;
}

/**
 * Pax başına EasyBook maliyetini çözer.
 * - override != null ise onu kullan (override 0 = admin'in bilinçli "ücretsiz" kararı, eksik değil).
 * - Aksi halde taban fiyatı kullan; taban null veya 0 ise => maliyet bilinmiyor (missing = true).
 */
export function resolvePerPaxCost(
  overrideAdult: number | null | undefined,
  overrideChild: number | null | undefined,
  baseAdult: number | null | undefined,
  baseChild: number | null | undefined
): PerPaxCost {
  const resolve = (
    override: number | null | undefined,
    base: number | null | undefined
  ): { cost: number; missing: boolean } => {
    if (override != null) {
      return { cost: round2(override), missing: false };
    }
    if (base != null && base > 0) {
      return { cost: round2(base), missing: false };
    }
    return { cost: 0, missing: true };
  };

  const adult = resolve(overrideAdult, baseAdult);
  const child = resolve(overrideChild, baseChild);

  return {
    cost_adult: adult.cost,
    cost_child: child.cost,
    missing_adult: adult.missing,
    missing_child: child.missing,
  };
}

export interface VoucherEarnings {
  /** EasyBook'a borç (maliyet). missing_cost ise 0 raporlanır ama UI'da "—" gösterilmeli. */
  easybook_cost: number;
  /** Acentenin liste satış fiyatı toplamı. */
  list_price: number;
  /** Standart marj = liste fiyatı − maliyet. */
  standard_margin: number;
  /** Bilete yazılan ekstra fark (upsell) = bilet fiyatı − liste fiyatı. İndirimse negatif. */
  extra_markup: number;
  /** Toplam kazanç = bilet fiyatı − maliyet = standart marj + ekstra fark. */
  total_profit: number;
  /** Maliyet hesaplanamıyor (taban fiyat yok / USD-GBP / tur yok). */
  missing_cost: boolean;
}

export interface ComputeVoucherEarningsInput {
  paxAdult: number;
  paxChild: number;
  totalPrice: number;
  cost: PerPaxCost;
  /** Liste satış fiyatı (pax başına). */
  listAdult: number;
  listChild: number;
  /**
   * TRUE ise fiyat rezervasyon başıdır (ör. ATV Double).
   * Hem maliyet hem liste fiyatı pax ile çarpılmaz, 1× uygulanır.
   */
  pricePerBooking?: boolean;
}

/**
 * Bir voucher için kazanç kırılımını hesaplar.
 * missing_cost: fiyatlanan (pax>0) bir yolcu tipi için maliyet kaynağı yoksa true.
 * Bu durumda easybook_cost / standard_margin / total_profit tutarsız olur;
 * çağıran taraf bu satırı toplamlardan hariç tutmalı ve "—" göstermeli.
 */
export function computeVoucherEarnings(
  input: ComputeVoucherEarningsInput
): VoucherEarnings {
  const { paxAdult, paxChild, totalPrice, cost, listAdult, listChild, pricePerBooking } = input;

  const easybook_cost = pricePerBooking
    ? round2(cost.cost_adult)
    : round2(cost.cost_adult * paxAdult + cost.cost_child * paxChild);
  const list_price = pricePerBooking
    ? round2(listAdult)
    : round2(listAdult * paxAdult + listChild * paxChild);
  const standard_margin = round2(list_price - easybook_cost);
  const extra_markup = round2(totalPrice - list_price);
  const total_profit = round2(totalPrice - easybook_cost);

  const missing_cost =
    (paxAdult > 0 && cost.missing_adult) ||
    (paxChild > 0 && cost.missing_child);

  return {
    easybook_cost,
    list_price,
    standard_margin,
    extra_markup,
    total_profit,
    missing_cost,
  };
}
