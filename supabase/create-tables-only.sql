-- =============================================================
-- EasyBook Voucher — Sadece Tabloları Oluştur
-- =============================================================
-- Bu script enum tipleri zaten var olduğunu varsayar
-- Sadece tabloları, fonksiyonları ve RLS politikalarını oluşturur
-- =============================================================

-- ========================  TABLOLAR  ========================

-- 1. agencies — Acenteler
CREATE TABLE IF NOT EXISTS agencies (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  address     TEXT,
  phone       TEXT,
  email       TEXT,
  commission_rate NUMERIC(5,2) DEFAULT 0,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. profiles — Kullanıcı profilleri (auth.users ile 1:1)
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT NOT NULL,
  role        user_role NOT NULL DEFAULT 'sales',
  agency_id   UUID REFERENCES agencies(id) ON DELETE SET NULL,
  phone       TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. tours — Tur tanımları
CREATE TABLE IF NOT EXISTS tours (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  description       TEXT,
  default_price     NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency          currency_type NOT NULL DEFAULT 'EUR',
  duration          TEXT,
  pickup_locations  TEXT[] DEFAULT '{}',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. vouchers — Voucher kayıtları
CREATE TABLE IF NOT EXISTS vouchers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_no      TEXT NOT NULL UNIQUE,
  tour_id         UUID REFERENCES tours(id) ON DELETE SET NULL,
  tour_date       DATE NOT NULL,
  customer_name   TEXT NOT NULL,
  hotel           TEXT,
  room_no         TEXT,
  pax_adult       INTEGER NOT NULL DEFAULT 0,
  pax_child       INTEGER NOT NULL DEFAULT 0,
  pax_infant      INTEGER NOT NULL DEFAULT 0,
  pickup_place    TEXT,
  pickup_time     TIME,
  total_price     NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency        currency_type NOT NULL DEFAULT 'EUR',
  deposit_paid    NUMERIC(10,2) NOT NULL DEFAULT 0,
  rest_to_pay     NUMERIC(10,2) GENERATED ALWAYS AS (total_price - deposit_paid) STORED,
  sales_person_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  agency_id       UUID REFERENCES agencies(id) ON DELETE SET NULL,
  status          voucher_status NOT NULL DEFAULT 'active',
  notes           TEXT,
  photo_url       TEXT,
  pdf_url         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. voucher_templates — Voucher tasarım şablonları
CREATE TABLE IF NOT EXISTS voucher_templates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  agency_id      UUID REFERENCES agencies(id) ON DELETE CASCADE,
  fields_config  JSONB NOT NULL DEFAULT '{}',
  design_config  JSONB NOT NULL DEFAULT '{}',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. payments — Ödeme hareketleri
CREATE TABLE IF NOT EXISTS payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  voucher_id      UUID NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  amount          NUMERIC(10,2) NOT NULL,
  currency        currency_type NOT NULL DEFAULT 'EUR',
  payment_method  payment_method NOT NULL DEFAULT 'cash',
  payment_date    TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================  İNDEKSLER  ========================

CREATE INDEX IF NOT EXISTS idx_profiles_agency      ON profiles (agency_id);
CREATE INDEX IF NOT EXISTS idx_profiles_role        ON profiles (role);
CREATE INDEX IF NOT EXISTS idx_vouchers_tour_date   ON vouchers (tour_date);
CREATE INDEX IF NOT EXISTS idx_vouchers_agency      ON vouchers (agency_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_sales       ON vouchers (sales_person_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_status      ON vouchers (status);
CREATE INDEX IF NOT EXISTS idx_vouchers_voucher_no  ON vouchers (voucher_no);
CREATE INDEX IF NOT EXISTS idx_payments_voucher     ON payments (voucher_id);
CREATE INDEX IF NOT EXISTS idx_tours_active         ON tours (is_active) WHERE is_active = TRUE;

-- ========================  updated_at TRİGGER  ========================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_vouchers_updated_at ON vouchers;
CREATE TRIGGER trg_vouchers_updated_at
  BEFORE UPDATE ON vouchers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_voucher_templates_updated_at ON voucher_templates;
CREATE TRIGGER trg_voucher_templates_updated_at
  BEFORE UPDATE ON voucher_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================  ROW LEVEL SECURITY  ========================

ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE agencies          ENABLE ROW LEVEL SECURITY;
ALTER TABLE tours             ENABLE ROW LEVEL SECURITY;
ALTER TABLE vouchers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE voucher_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;

-- ---------- Yardımcı fonksiyonlar ----------

-- Oturum açmış kullanıcının rolünü döndürür
CREATE OR REPLACE FUNCTION auth_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Oturum açmış kullanıcının acente id'sini döndürür
CREATE OR REPLACE FUNCTION auth_user_agency_id()
RETURNS UUID AS $$
  SELECT agency_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ---------- profiles ----------

DROP POLICY IF EXISTS "profiles_select" ON profiles;
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR id = auth.uid()
  OR (auth_user_role() = 'agency_admin' AND agency_id = auth_user_agency_id())
);

DROP POLICY IF EXISTS "profiles_insert" ON profiles;
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin')
);

DROP POLICY IF EXISTS "profiles_update" ON profiles;
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR id = auth.uid()
);

DROP POLICY IF EXISTS "profiles_delete" ON profiles;
CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

-- ---------- agencies ----------

DROP POLICY IF EXISTS "agencies_select" ON agencies;
CREATE POLICY "agencies_select" ON agencies FOR SELECT USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR id = auth_user_agency_id()
);

DROP POLICY IF EXISTS "agencies_insert" ON agencies;
CREATE POLICY "agencies_insert" ON agencies FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin')
);

DROP POLICY IF EXISTS "agencies_update" ON agencies;
CREATE POLICY "agencies_update" ON agencies FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR (auth_user_role() = 'agency_admin' AND id = auth_user_agency_id())
);

DROP POLICY IF EXISTS "agencies_delete" ON agencies;
CREATE POLICY "agencies_delete" ON agencies FOR DELETE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

-- ---------- tours ----------

DROP POLICY IF EXISTS "tours_select" ON tours;
CREATE POLICY "tours_select" ON tours FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "tours_insert" ON tours;
CREATE POLICY "tours_insert" ON tours FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin')
);

DROP POLICY IF EXISTS "tours_update" ON tours;
CREATE POLICY "tours_update" ON tours FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

DROP POLICY IF EXISTS "tours_delete" ON tours;
CREATE POLICY "tours_delete" ON tours FOR DELETE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

-- ---------- vouchers ----------

DROP POLICY IF EXISTS "vouchers_select" ON vouchers;
CREATE POLICY "vouchers_select" ON vouchers FOR SELECT USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR (auth_user_role() = 'agency_admin' AND agency_id = auth_user_agency_id())
  OR (auth_user_role() = 'sales' AND sales_person_id = auth.uid())
);

DROP POLICY IF EXISTS "vouchers_insert" ON vouchers;
CREATE POLICY "vouchers_insert" ON vouchers FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin', 'agency_admin', 'sales')
);

DROP POLICY IF EXISTS "vouchers_update" ON vouchers;
CREATE POLICY "vouchers_update" ON vouchers FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR (auth_user_role() = 'agency_admin' AND agency_id = auth_user_agency_id())
);

DROP POLICY IF EXISTS "vouchers_delete" ON vouchers;
CREATE POLICY "vouchers_delete" ON vouchers FOR DELETE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

-- ---------- voucher_templates ----------

DROP POLICY IF EXISTS "voucher_templates_select" ON voucher_templates;
CREATE POLICY "voucher_templates_select" ON voucher_templates FOR SELECT USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR agency_id IS NULL
  OR agency_id = auth_user_agency_id()
);

DROP POLICY IF EXISTS "voucher_templates_insert" ON voucher_templates;
CREATE POLICY "voucher_templates_insert" ON voucher_templates FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin')
  OR (auth_user_role() = 'agency_admin' AND agency_id = auth_user_agency_id())
);

DROP POLICY IF EXISTS "voucher_templates_update" ON voucher_templates;
CREATE POLICY "voucher_templates_update" ON voucher_templates FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR (auth_user_role() = 'agency_admin' AND agency_id = auth_user_agency_id())
);

DROP POLICY IF EXISTS "voucher_templates_delete" ON voucher_templates;
CREATE POLICY "voucher_templates_delete" ON voucher_templates FOR DELETE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

-- ---------- payments ----------

DROP POLICY IF EXISTS "payments_select" ON payments;
CREATE POLICY "payments_select" ON payments FOR SELECT USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR EXISTS (
    SELECT 1 FROM vouchers v
    WHERE v.id = payments.voucher_id
    AND (
      (auth_user_role() = 'agency_admin' AND v.agency_id = auth_user_agency_id())
      OR (auth_user_role() = 'sales' AND v.sales_person_id = auth.uid())
    )
  )
);

DROP POLICY IF EXISTS "payments_insert" ON payments;
CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin', 'agency_admin', 'sales')
);

DROP POLICY IF EXISTS "payments_update" ON payments;
CREATE POLICY "payments_update" ON payments FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

DROP POLICY IF EXISTS "payments_delete" ON payments;
CREATE POLICY "payments_delete" ON payments FOR DELETE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

-- ========================  STORAGE BUCKET  ========================

-- Voucher fotoğrafları için Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('voucher-photos', 'voucher-photos', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
DROP POLICY IF EXISTS "voucher_photos_insert" ON storage.objects;
CREATE POLICY "voucher_photos_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'voucher-photos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "voucher_photos_select" ON storage.objects;
CREATE POLICY "voucher_photos_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'voucher-photos' AND auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "voucher_photos_delete" ON storage.objects;
CREATE POLICY "voucher_photos_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'voucher-photos' AND auth_user_role() IN ('super_admin', 'admin'));

-- ========================  AUTH TRİGGER  ========================

-- Yeni kullanıcı kaydı yapıldığında otomatik profile oluştur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Yeni Kullanıcı'),
    'sales'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========================  BİTTİ  ========================

SELECT 'Tablolar, fonksiyonlar ve RLS politikaları başarıyla oluşturuldu!' as mesaj;
