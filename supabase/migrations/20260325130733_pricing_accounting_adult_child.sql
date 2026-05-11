-- ============================================================
-- Tur Fiyatlandırma & Acente Muhasebe Modülü — Migration
-- Supabase SQL Editor'de çalıştırın
-- ============================================================

-- 1. tours: EasyBook base fiyatları (Yetişkin + Çocuk ayrı)
ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS base_price_adult_eur DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_price_child_eur DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_price_adult_try DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_price_child_try DECIMAL(10,2) DEFAULT 0;

-- 2. vouchers: Acente → EasyBook borç takibi
ALTER TABLE vouchers
  ADD COLUMN IF NOT EXISTS agent_owes_easybook_eur DECIMAL(10,2) DEFAULT 0;

-- 3. agent_payments: Acente ödemeleri tablosu
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

-- 4. RLS — sadece admin görebilir/yönetebilir
ALTER TABLE agent_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_agent_payments" ON agent_payments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('super_admin', 'admin')
    )
  );

-- 5. İndeksler
CREATE INDEX IF NOT EXISTS idx_agent_payments_agent ON agent_payments (agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_payments_date ON agent_payments (payment_date);

-- 6. Trigger: bilet kesildiğinde agent_owes_easybook_eur'yu otomatik doldur
--    Yetişkin * yetişkin_fiyat + Çocuk * çocuk_fiyat
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

-- Mevcut trigger varsa düşür, yeniden oluştur
DROP TRIGGER IF EXISTS trg_set_agent_owes ON vouchers;
CREATE TRIGGER trg_set_agent_owes
  BEFORE INSERT ON vouchers
  FOR EACH ROW EXECUTE FUNCTION set_agent_owes_on_voucher();
