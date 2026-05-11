-- =========================================================================
-- MASTER FINAL MIGRATION
-- Bu betik, şu ana kadar kodladığımız tüm eksik sütunları, yetkileri 
-- ve ek tabloları (IF NOT EXISTS korumasıyla) güvenle ekler.
-- Supabase SQL Editor üzerinden tek seferde çalıştırabilirsiniz.
-- Daha önce çalıştırılan kısımlar "zaten var" diyerek hata vermeden geçilecektir.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. ACENTELER (AGENCIES) - Acente Kodu
-- -------------------------------------------------------------------------
ALTER TABLE agencies ADD COLUMN IF NOT EXISTS agency_code TEXT UNIQUE;

-- Daha önce kod atanmamışlara otomatik kod ata (varsa)
WITH numbered_agencies AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at) as rn
  FROM agencies
  WHERE agency_code IS NULL
)
UPDATE agencies 
SET agency_code = '2026' || LPAD(na.rn::TEXT, 3, '0')
FROM numbered_agencies na
WHERE agencies.id = na.id;

-- -------------------------------------------------------------------------
-- 2. TURLAR (TOURS) - Çocuk/Yetişkin Fiyatlandırması
-- -------------------------------------------------------------------------
ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS base_price_adult_eur DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_price_child_eur DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_price_adult_try DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_price_child_try DECIMAL(10,2) DEFAULT 0;

-- -------------------------------------------------------------------------
-- 3. BİLETLER (VOUCHERS) - Kişi Sayıları ve Acente Borç Takibi
-- -------------------------------------------------------------------------
ALTER TABLE vouchers
  ADD COLUMN IF NOT EXISTS pax_adult INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS pax_child INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pax_infant INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS agent_owes_easybook_eur DECIMAL(10,2) DEFAULT 0;

-- Trigger: Bilet kesildiğinde base_price_adult_eur ve base_price_child_eur üzerinden 
-- agent_owes_easybook_eur hesapla. (Güncel trigger mantığı)
CREATE OR REPLACE FUNCTION set_agent_owes_on_voucher()
RETURNS TRIGGER AS $$
DECLARE
  v_adult_price DECIMAL(10,2);
  v_child_price DECIMAL(10,2);
BEGIN
  IF NEW.tour_id IS NOT NULL THEN
    SELECT base_price_adult_eur, base_price_child_eur
    INTO v_adult_price, v_child_price
    FROM tours WHERE id = NEW.tour_id;

    NEW.agent_owes_easybook_eur :=
      COALESCE(NEW.pax_adult, 0) * COALESCE(v_adult_price, 0) +
      COALESCE(NEW.pax_child, 0) * COALESCE(v_child_price, 0);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_agent_owes ON vouchers;
CREATE TRIGGER trg_set_agent_owes
  BEFORE INSERT ON vouchers
  FOR EACH ROW EXECUTE FUNCTION set_agent_owes_on_voucher();

-- Voucher ekleme/güncellemeyi sadece Admin'lere Özel Kılalım
DROP POLICY IF EXISTS "vouchers_insert_admin_only" ON vouchers;
CREATE POLICY "vouchers_insert_admin_only" ON vouchers FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin')
);

DROP POLICY IF EXISTS "vouchers_update_admin_only" ON vouchers;
CREATE POLICY "vouchers_update_admin_only" ON vouchers FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin')
);


-- -------------------------------------------------------------------------
-- 4. ACENTE ÖDEMELERİ (AGENT PAYMENTS)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  agent_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  payment_amount DECIMAL(10,2) NOT NULL,
  payment_currency currency_type NOT NULL DEFAULT 'EUR',
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  related_voucher_id UUID REFERENCES vouchers(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE agent_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_full_agent_payments" ON agent_payments;
CREATE POLICY "admin_full_agent_payments" ON agent_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  );

CREATE INDEX IF NOT EXISTS idx_agent_payments_agent ON agent_payments (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_payments_date ON agent_payments (payment_date);

-- -------------------------------------------------------------------------
-- 5. SİTE AYARLARI (SETTINGS) & STORAGE (public-assets)
-- -------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "settings_select_public" ON settings;
CREATE POLICY "settings_select_public" ON settings FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "settings_insert_admin" ON settings;
CREATE POLICY "settings_insert_admin" ON settings FOR INSERT
  WITH CHECK (auth_user_role() IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS "settings_update_admin" ON settings;
CREATE POLICY "settings_update_admin" ON settings FOR UPDATE
  USING (auth_user_role() IN ('super_admin', 'admin'));

DROP TRIGGER IF EXISTS trg_settings_updated_at ON settings;
CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Storage Buffer (zaten varsa hata vermeden geçer)
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-assets', 'public-assets', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage Rules (Sadece Admin Yükleyebilir, Herkes Görebilir)
DROP POLICY IF EXISTS "public_assets_select" ON storage.objects;
CREATE POLICY "public_assets_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'public-assets');

DROP POLICY IF EXISTS "public_assets_insert" ON storage.objects;
CREATE POLICY "public_assets_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'public-assets' AND auth_user_role() IN ('super_admin', 'admin'));

DROP POLICY IF EXISTS "public_assets_update" ON storage.objects;
CREATE POLICY "public_assets_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'public-assets' AND auth_user_role() IN ('super_admin', 'admin'));

-- Tüm işlemler garantili olarak kaydedildi!
