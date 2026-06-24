-- =============================================================
-- EUR Snapshot — Voucher & Agent Payment EUR Snapshot Columns
-- =============================================================
-- Amaç:
--   Cari hesap ve earnings raporları tek para birimi (EUR) cinsinden
--   tutulsun. Voucher orijinal para biriminde görüntülenmeye devam eder
--   ama her voucher + ödeme oluşturulurken o gün geçerli TCMB kuru ile
--   EUR karşılığı snapshot olarak saklanır. Snapshot kilitli kalır —
--   sonradan kurlar değişse de cari bakiyesi kaymaz.
--
--   Tüm yeni kolonlar nullable; eski satırlar bu migration sonunda
--   backfill bloğu ile doldurulur. Hiç kur bulunamayan eski satırlar
--   NULL kalır; uygulama katmanı bu durumu graceful handle eder.
-- =============================================================

-- 1) vouchers tablosuna EUR snapshot kolonları
ALTER TABLE public.vouchers
  ADD COLUMN IF NOT EXISTS total_price_eur     NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS deposit_paid_eur    NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS easybook_cost_eur   NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS eur_rate_snapshot   NUMERIC(14,6),
  ADD COLUMN IF NOT EXISTS eur_rate_date       DATE;

COMMENT ON COLUMN public.vouchers.total_price_eur IS
  '1 birim voucher.currency = eur_rate_snapshot EUR. total_price * eur_rate_snapshot. Voucher oluşturulduğunda kilitlenir.';
COMMENT ON COLUMN public.vouchers.deposit_paid_eur IS
  'deposit_paid * eur_rate_snapshot. Snapshot ile aynı kur.';
COMMENT ON COLUMN public.vouchers.easybook_cost_eur IS
  'Voucher oluşturulduğu anda hesaplanan EasyBook maliyeti (per-pax toplam) EUR snapshot.';
COMMENT ON COLUMN public.vouchers.eur_rate_snapshot IS
  '1 birim voucher.currency = X EUR. Voucher CREATE anında TCMB kuru ile kilitlenir, UPDATE değiştirmez.';
COMMENT ON COLUMN public.vouchers.eur_rate_date IS
  'eur_rate_snapshot için kullanılan exchange_rates.effective_date.';

-- 2) agent_payments tablosuna EUR snapshot kolonları
ALTER TABLE public.agent_payments
  ADD COLUMN IF NOT EXISTS payment_amount_eur NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS eur_rate_snapshot  NUMERIC(14,6),
  ADD COLUMN IF NOT EXISTS eur_rate_date      DATE;

COMMENT ON COLUMN public.agent_payments.payment_amount_eur IS
  'payment_amount * eur_rate_snapshot. Ödeme tarihindeki kur ile EUR karşılığı kilitlenir.';

-- 3) Partial index: EUR snapshot'lı satırları hızlı sorgulamak için
CREATE INDEX IF NOT EXISTS idx_vouchers_agency_eur
  ON public.vouchers (agency_id, status)
  WHERE total_price_eur IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_agent_payments_agent_eur
  ON public.agent_payments (agent_id)
  WHERE payment_amount_eur IS NOT NULL;

-- 4) Yardımcı fonksiyon — Bir tarih ve currency için 1 birim X = ? EUR
--    döner. EUR→EUR = 1. Direct (X→EUR) varsa onu, yoksa inverse (EUR→X)
--    varsa 1/rate, yoksa NULL. exchange_rates_history fonksiyonunun
--    EUR'a özelleşmiş ve inverse-aware versiyonu.
CREATE OR REPLACE FUNCTION public.get_eur_rate_for_date(
  p_currency currency_type,
  p_date     DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  IF p_currency = 'EUR' THEN
    RETURN 1::NUMERIC;
  END IF;

  -- Direct: X → EUR
  SELECT rate INTO v_rate
  FROM public.exchange_rates
  WHERE from_currency = p_currency
    AND to_currency   = 'EUR'
    AND effective_date <= p_date
  ORDER BY effective_date DESC
  LIMIT 1;

  IF v_rate IS NOT NULL THEN
    RETURN v_rate;
  END IF;

  -- Inverse: EUR → X  (1 X = 1/rate EUR)
  SELECT rate INTO v_rate
  FROM public.exchange_rates
  WHERE from_currency = 'EUR'
    AND to_currency   = p_currency
    AND effective_date <= p_date
  ORDER BY effective_date DESC
  LIMIT 1;

  IF v_rate IS NOT NULL AND v_rate <> 0 THEN
    RETURN 1::NUMERIC / v_rate;
  END IF;

  -- Çapraz: X → TRY ve EUR → TRY üzerinden (TCMB tipik şeması)
  DECLARE
    v_x_try  NUMERIC;
    v_eur_try NUMERIC;
  BEGIN
    SELECT rate INTO v_x_try
    FROM public.exchange_rates
    WHERE from_currency = p_currency
      AND to_currency   = 'TRY'
      AND effective_date <= p_date
    ORDER BY effective_date DESC
    LIMIT 1;

    SELECT rate INTO v_eur_try
    FROM public.exchange_rates
    WHERE from_currency = 'EUR'
      AND to_currency   = 'TRY'
      AND effective_date <= p_date
    ORDER BY effective_date DESC
    LIMIT 1;

    IF v_x_try IS NOT NULL AND v_eur_try IS NOT NULL AND v_eur_try <> 0 THEN
      RETURN v_x_try / v_eur_try;
    END IF;
  END;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION public.get_eur_rate_for_date IS
  '1 birim p_currency = ? EUR. EUR=1, direct lookup, inverse fallback, sonra çapraz TRY üzerinden. Bulunamazsa NULL.';

-- 5) Backfill — mevcut voucher'lara EUR snapshot ata
DO $$
DECLARE
  v_filled INT := 0;
  v_skipped INT := 0;
BEGIN
  UPDATE public.vouchers v
  SET
    eur_rate_date     = COALESCE(v.eur_rate_date, v.created_at::date),
    eur_rate_snapshot = COALESCE(
      v.eur_rate_snapshot,
      public.get_eur_rate_for_date(v.currency, v.created_at::date)
    )
  WHERE v.eur_rate_snapshot IS NULL;

  UPDATE public.vouchers v
  SET
    total_price_eur  = ROUND((v.total_price  * v.eur_rate_snapshot)::numeric, 2),
    deposit_paid_eur = ROUND((v.deposit_paid * v.eur_rate_snapshot)::numeric, 2)
  WHERE v.total_price_eur IS NULL
    AND v.eur_rate_snapshot IS NOT NULL;

  GET DIAGNOSTICS v_filled = ROW_COUNT;

  SELECT COUNT(*) INTO v_skipped
  FROM public.vouchers
  WHERE total_price_eur IS NULL;

  RAISE NOTICE 'voucher EUR snapshot backfill: % filled, % skipped (no rate)', v_filled, v_skipped;
END $$;

-- 6) Backfill — mevcut agent_payments'a EUR snapshot ata
DO $$
DECLARE
  v_filled INT := 0;
  v_skipped INT := 0;
BEGIN
  UPDATE public.agent_payments p
  SET
    eur_rate_date     = COALESCE(p.eur_rate_date, p.payment_date),
    eur_rate_snapshot = COALESCE(
      p.eur_rate_snapshot,
      public.get_eur_rate_for_date(p.payment_currency, p.payment_date)
    )
  WHERE p.eur_rate_snapshot IS NULL;

  UPDATE public.agent_payments p
  SET payment_amount_eur = ROUND((p.payment_amount * p.eur_rate_snapshot)::numeric, 2)
  WHERE p.payment_amount_eur IS NULL
    AND p.eur_rate_snapshot IS NOT NULL;

  GET DIAGNOSTICS v_filled = ROW_COUNT;

  SELECT COUNT(*) INTO v_skipped
  FROM public.agent_payments
  WHERE payment_amount_eur IS NULL;

  RAISE NOTICE 'agent_payments EUR snapshot backfill: % filled, % skipped (no rate)', v_filled, v_skipped;
END $$;

-- 7) NOT NULL constraint'leri sonraki migration'a bırakıyoruz — şu an
--    nullable bırakarak hiç kur olmayan edge case'leri tolere ediyoruz.
--    Backfill başarılı olunca ayrı bir migration ile NOT NULL eklenecek.
