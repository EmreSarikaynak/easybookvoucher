-- ============================================================
-- Acente Cari Hesap modülü — agent_payments tablosu (re-create)
--
-- Geçmiş:
--   20260325...: ilk versiyon (agent_owes_easybook_eur kolonu vardı)
--   20260523_remove_commission_and_accounting: tablo + kolonlar kaldırıldı
--   20260528 (bu): cari ekranı için yeniden eklendi; bu sefer eski
--     agent_owes_easybook_eur kolonu yok — borç tutarı uygulama
--     katmanında bilet bazlı hesaplanıyor (src/lib/pricing.ts).
--
-- Bu migration idempotent: tabloyu IF NOT EXISTS ile oluşturur,
-- policy'leri DROP/CREATE eder. Birden çok kez çalıştırılması güvenlidir.
-- ============================================================

-- 1) agent_payments tablosu
CREATE TABLE IF NOT EXISTS public.agent_payments (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id            UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  payment_amount      NUMERIC(12,2) NOT NULL CHECK (payment_amount > 0),
  payment_currency    currency_type NOT NULL DEFAULT 'EUR',
  payment_date        DATE NOT NULL DEFAULT CURRENT_DATE,
  related_voucher_id  UUID REFERENCES public.vouchers(id) ON DELETE SET NULL,
  notes               TEXT,
  created_by          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) İndeksler
CREATE INDEX IF NOT EXISTS idx_agent_payments_agent ON public.agent_payments (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_payments_date  ON public.agent_payments (payment_date DESC);

-- 3) RLS
ALTER TABLE public.agent_payments ENABLE ROW LEVEL SECURITY;

-- Tüm policy'leri (varsa) düşür, yeniden oluştur.
DROP POLICY IF EXISTS "admin_full_agent_payments"       ON public.agent_payments;
DROP POLICY IF EXISTS "agent_payments_select_admin"     ON public.agent_payments;
DROP POLICY IF EXISTS "agent_payments_select_agency"    ON public.agent_payments;
DROP POLICY IF EXISTS "agent_payments_insert_admin"     ON public.agent_payments;
DROP POLICY IF EXISTS "agent_payments_update_admin"     ON public.agent_payments;
DROP POLICY IF EXISTS "agent_payments_delete_admin"     ON public.agent_payments;

-- Admin/super_admin: tam yetki (INSERT/UPDATE/DELETE/SELECT)
CREATE POLICY "agent_payments_select_admin"
  ON public.agent_payments FOR SELECT
  USING (auth_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "agent_payments_insert_admin"
  ON public.agent_payments FOR INSERT
  WITH CHECK (auth_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "agent_payments_update_admin"
  ON public.agent_payments FOR UPDATE
  USING (auth_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "agent_payments_delete_admin"
  ON public.agent_payments FOR DELETE
  USING (auth_user_role() IN ('super_admin', 'admin'));

-- Acente kullanıcıları: SADECE kendi acentelerinin ödemelerini görebilir.
-- Yazma yetkisi yok (admin ekler/siler).
CREATE POLICY "agent_payments_select_agency"
  ON public.agent_payments FOR SELECT
  USING (
    auth_user_role() IN ('agency_admin', 'sales')
    AND agent_id = auth_user_agency_id()
  );

COMMENT ON TABLE public.agent_payments IS
  'Acentelerin EasyBook''a yaptığı ödemeler. Borç = aktif biletlerin maliyet toplamı (uygulamada hesaplanır), Net Bakiye = Borç − Ödemeler.';
