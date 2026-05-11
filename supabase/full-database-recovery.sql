-- =============================================================
-- EasyBook Voucher Yönetim Sistemi — Supabase SQL Şeması
-- =============================================================

-- ========================  ENUM TİPLERİ  ========================

CREATE TYPE user_role AS ENUM ('super_admin', 'admin', 'agency_admin', 'sales');
CREATE TYPE currency_type AS ENUM ('TRY', 'EUR', 'USD', 'GBP');
CREATE TYPE voucher_status AS ENUM ('active', 'cancelled', 'completed');
CREATE TYPE payment_method AS ENUM ('cash', 'credit_card', 'bank_transfer', 'other');

-- ========================  TABLOLAR  ========================

-- 1. agencies — Acenteler
CREATE TABLE agencies (
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
CREATE TABLE profiles (
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
CREATE TABLE tours (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT NOT NULL,
  description       TEXT,
  default_price     NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency          currency_type NOT NULL DEFAULT 'EUR',
  duration          TEXT,                          -- örn. "Tam Gün", "Yarım Gün", "2 Saat"
  pickup_locations  TEXT[] DEFAULT '{}',           -- olası alış noktaları
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. vouchers — Voucher kayıtları
CREATE TABLE vouchers (
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
CREATE TABLE voucher_templates (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name           TEXT NOT NULL,
  agency_id      UUID REFERENCES agencies(id) ON DELETE CASCADE,  -- NULL = genel şablon
  fields_config  JSONB NOT NULL DEFAULT '{}',                     -- alan düzeni yapılandırması
  design_config  JSONB NOT NULL DEFAULT '{}',                     -- görsel tasarım yapılandırması
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. payments — Ödeme hareketleri
CREATE TABLE payments (
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

CREATE INDEX idx_profiles_agency      ON profiles (agency_id);
CREATE INDEX idx_profiles_role        ON profiles (role);
CREATE INDEX idx_vouchers_tour_date   ON vouchers (tour_date);
CREATE INDEX idx_vouchers_agency      ON vouchers (agency_id);
CREATE INDEX idx_vouchers_sales       ON vouchers (sales_person_id);
CREATE INDEX idx_vouchers_status      ON vouchers (status);
CREATE INDEX idx_vouchers_voucher_no  ON vouchers (voucher_no);
CREATE INDEX idx_payments_voucher     ON payments (voucher_id);
CREATE INDEX idx_tours_active         ON tours (is_active) WHERE is_active = TRUE;

-- ========================  updated_at TRİGGER  ========================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_vouchers_updated_at
  BEFORE UPDATE ON vouchers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

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

CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR id = auth.uid()
  OR (auth_user_role() = 'agency_admin' AND agency_id = auth_user_agency_id())
);

CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin')
);

CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR id = auth.uid()
);

CREATE POLICY "profiles_delete" ON profiles FOR DELETE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

-- ---------- agencies ----------

CREATE POLICY "agencies_select" ON agencies FOR SELECT USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR id = auth_user_agency_id()
);

CREATE POLICY "agencies_insert" ON agencies FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin')
);

CREATE POLICY "agencies_update" ON agencies FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR (auth_user_role() = 'agency_admin' AND id = auth_user_agency_id())
);

CREATE POLICY "agencies_delete" ON agencies FOR DELETE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

-- ---------- tours ----------

CREATE POLICY "tours_select" ON tours FOR SELECT USING (TRUE);  -- Herkes turları görebilir

CREATE POLICY "tours_insert" ON tours FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin')
);

CREATE POLICY "tours_update" ON tours FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

CREATE POLICY "tours_delete" ON tours FOR DELETE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

-- ---------- vouchers ----------

CREATE POLICY "vouchers_select" ON vouchers FOR SELECT USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR (auth_user_role() = 'agency_admin' AND agency_id = auth_user_agency_id())
  OR (auth_user_role() = 'sales' AND sales_person_id = auth.uid())
);

CREATE POLICY "vouchers_insert" ON vouchers FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin', 'agency_admin', 'sales')
);

CREATE POLICY "vouchers_update" ON vouchers FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR (auth_user_role() = 'agency_admin' AND agency_id = auth_user_agency_id())
);

CREATE POLICY "vouchers_delete" ON vouchers FOR DELETE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

-- ---------- voucher_templates ----------

CREATE POLICY "voucher_templates_select" ON voucher_templates FOR SELECT USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR agency_id IS NULL  -- genel şablonlar herkese açık
  OR agency_id = auth_user_agency_id()
);

CREATE POLICY "voucher_templates_insert" ON voucher_templates FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin')
  OR (auth_user_role() = 'agency_admin' AND agency_id = auth_user_agency_id())
);

CREATE POLICY "voucher_templates_update" ON voucher_templates FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR (auth_user_role() = 'agency_admin' AND agency_id = auth_user_agency_id())
);

CREATE POLICY "voucher_templates_delete" ON voucher_templates FOR DELETE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

-- ---------- payments ----------

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

CREATE POLICY "payments_insert" ON payments FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin', 'agency_admin', 'sales')
);

CREATE POLICY "payments_update" ON payments FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

CREATE POLICY "payments_delete" ON payments FOR DELETE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

-- ========================  STORAGE BUCKET  ========================

-- Voucher fotoğrafları için Storage bucket (Supabase Dashboard'dan da oluşturulabilir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('voucher-photos', 'voucher-photos', FALSE)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Giriş yapmış kullanıcılar yükleyebilir
CREATE POLICY "voucher_photos_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'voucher-photos' AND auth.uid() IS NOT NULL);

-- Storage RLS: Yüklenen dosyayı herkes (oturum açmış) okuyabilir
CREATE POLICY "voucher_photos_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'voucher-photos' AND auth.uid() IS NOT NULL);

-- Storage RLS: Sadece admin silebilir
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
    'sales' -- varsayılan rol
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =============================================================
-- EasyBook Boat Rental System — Supabase SQL Schema
-- =============================================================
-- This adds boat rental functionality alongside existing tour vouchers
-- Run this after the main schema.sql has been applied

-- ========================  ENUM TYPES  ========================

CREATE TYPE boat_status_type AS ENUM ('active', 'maintenance', 'inactive');
CREATE TYPE occupancy_status_type AS ENUM ('available', 'booked', 'pending', 'blocked');

-- ========================  TABLES  ========================

-- 1. boats — Tekne filosu
CREATE TABLE boats (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  specifications  JSONB NOT NULL DEFAULT '{
    "length_meters": 0,
    "capacity_max": 0,
    "crew_count": 0,
    "equipment": []
  }',
  base_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
  currency        currency_type NOT NULL DEFAULT 'EUR',
  gallery         TEXT[] DEFAULT '{}',  -- Array of image URLs from Supabase Storage
  status          boat_status_type NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. occupancy_calendar — Nisan-Ekim doluluk takvimi
CREATE TABLE occupancy_calendar (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id     UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  status      occupancy_status_type NOT NULL DEFAULT 'available',
  booking_id  UUID REFERENCES boat_bookings(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(boat_id, date)  -- Bir tekne için her tarih sadece 1 kez
);

-- 3. boat_bookings — Tekne kiralama rezervasyonları
CREATE TABLE boat_bookings (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id         UUID NOT NULL REFERENCES boats(id) ON DELETE RESTRICT,
  booking_date    DATE NOT NULL,
  customer_info   JSONB NOT NULL DEFAULT '{
    "name": "",
    "phone": "",
    "email": "",
    "guests": 0
  }',
  payment_details JSONB NOT NULL DEFAULT '{
    "total": 0,
    "paid": 0,
    "remaining": 0,
    "currency": "EUR"
  }',
  check_in_time   TIME,
  check_out_time  TIME,
  captain_info    JSONB DEFAULT NULL,  -- {"name": "", "license": ""}
  extras          JSONB DEFAULT NULL,  -- {"food": false, "fuel_included": false, "notes": ""}
  departure_port  TEXT,
  agency_id       UUID REFERENCES agencies(id) ON DELETE SET NULL,
  sales_person_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status          voucher_status NOT NULL DEFAULT 'active',  -- Reuse existing enum
  notes           TEXT,
  pdf_url         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Add foreign key constraint after boat_bookings table exists
ALTER TABLE occupancy_calendar
  DROP CONSTRAINT IF EXISTS occupancy_calendar_booking_id_fkey,
  ADD CONSTRAINT occupancy_calendar_booking_id_fkey 
    FOREIGN KEY (booking_id) REFERENCES boat_bookings(id) ON DELETE SET NULL;

-- ========================  INDEXES  ========================

CREATE INDEX idx_boats_status ON boats (status) WHERE status = 'active';
CREATE INDEX idx_occupancy_boat_date ON occupancy_calendar (boat_id, date);
CREATE INDEX idx_occupancy_date_range ON occupancy_calendar (date);
CREATE INDEX idx_occupancy_status ON occupancy_calendar (status);
CREATE INDEX idx_bookings_boat ON boat_bookings (boat_id);
CREATE INDEX idx_bookings_date ON boat_bookings (booking_date);
CREATE INDEX idx_bookings_agency ON boat_bookings (agency_id);
CREATE INDEX idx_bookings_sales ON boat_bookings (sales_person_id);
CREATE INDEX idx_bookings_status ON boat_bookings (status);

-- ========================  TRIGGERS  ========================

-- Auto-update updated_at on boats
CREATE TRIGGER trg_boats_updated_at
  BEFORE UPDATE ON boats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update updated_at on occupancy_calendar
CREATE TRIGGER trg_occupancy_updated_at
  BEFORE UPDATE ON occupancy_calendar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-update updated_at on boat_bookings
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON boat_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================  ROW LEVEL SECURITY  ========================

ALTER TABLE boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE occupancy_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE boat_bookings ENABLE ROW LEVEL SECURITY;

-- ---------- boats ----------

-- Herkes aktif tekneleri görebilir
CREATE POLICY "boats_select" ON boats FOR SELECT USING (
  status = 'active' OR auth_user_role() IN ('super_admin', 'admin', 'agency_admin')
);

-- Sadece admin ve agency_admin tekne ekleyebilir
CREATE POLICY "boats_insert" ON boats FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin', 'agency_admin')
);

-- Sadece admin ve agency_admin tekne güncelleyebilir
CREATE POLICY "boats_update" ON boats FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin', 'agency_admin')
);

-- Sadece admin tekne silebilir
CREATE POLICY "boats_delete" ON boats FOR DELETE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

-- ---------- occupancy_calendar ----------

-- Herkes takvimi görebilir (doluluk kontrolü için)
CREATE POLICY "occupancy_select" ON occupancy_calendar FOR SELECT USING (TRUE);

-- Sadece admin ve agency_admin takvimi güncelleyebilir
CREATE POLICY "occupancy_insert" ON occupancy_calendar FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin', 'agency_admin', 'sales')
);

CREATE POLICY "occupancy_update" ON occupancy_calendar FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin', 'agency_admin')
);

CREATE POLICY "occupancy_delete" ON occupancy_calendar FOR DELETE USING (
  auth_user_role() IN ('super_admin', 'admin', 'agency_admin')
);

-- ---------- boat_bookings ----------

-- Kullanıcılar kendi rezervasyonlarını veya kendi acentelerinin rezervasyonlarını görebilir
CREATE POLICY "bookings_select" ON boat_bookings FOR SELECT USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR (auth_user_role() = 'agency_admin' AND agency_id = auth_user_agency_id())
  OR (auth_user_role() = 'sales' AND sales_person_id = auth.uid())
);

-- Herkes rezervasyon oluşturabilir (kendi adına)
CREATE POLICY "bookings_insert" ON boat_bookings FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin', 'agency_admin', 'sales')
);

-- Admin ve agency_admin rezervasyonları güncelleyebilir
CREATE POLICY "bookings_update" ON boat_bookings FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR (auth_user_role() = 'agency_admin' AND agency_id = auth_user_agency_id())
);

-- Sadece admin silebilir
CREATE POLICY "bookings_delete" ON boat_bookings FOR DELETE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

-- ========================  STORAGE BUCKET  ========================

-- Tekne fotoğrafları için Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('boat-photos', 'boat-photos', TRUE)  -- Public bucket for easier display
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Giriş yapmış admin/agency_admin yükleyebilir
CREATE POLICY "boat_photos_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'boat-photos' 
    AND auth_user_role() IN ('super_admin', 'admin', 'agency_admin')
  );

-- Storage RLS: Herkes okuyabilir (public bucket)
CREATE POLICY "boat_photos_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'boat-photos');

-- Storage RLS: Sadece admin silebilir
CREATE POLICY "boat_photos_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'boat-photos' 
    AND auth_user_role() IN ('super_admin', 'admin')
  );

-- ========================  REALTIME  ========================

-- Occupancy calendar için Realtime yayını etkinleştir
-- Supabase Dashboard'da manuel: Database > Publications > supabase_realtime > Edit > Add occupancy_calendar
-- VEYA SQL ile:
ALTER PUBLICATION supabase_realtime ADD TABLE occupancy_calendar;

-- ========================  HELPER FUNCTIONS  ========================

-- Belirli bir tarih aralığı için takvim satırlarını otomatik oluştur
CREATE OR REPLACE FUNCTION generate_occupancy_for_boat(
  p_boat_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS INTEGER AS $$
DECLARE
  v_current_date DATE := p_start_date;
  v_count INTEGER := 0;
BEGIN
  WHILE v_current_date <= p_end_date LOOP
    INSERT INTO occupancy_calendar (boat_id, date, status)
    VALUES (p_boat_id, v_current_date, 'available')
    ON CONFLICT (boat_id, date) DO NOTHING;
    
    v_count := v_count + 1;
    v_current_date := v_current_date + INTERVAL '1 day';
  END LOOP;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- Tüm tekneler için Nisan-Ekim takvimi oluştur (otomatik tetikleyici)
CREATE OR REPLACE FUNCTION auto_generate_occupancy()
RETURNS TRIGGER AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Mevcut yılın Nisan-Ekim aralığı
  v_start_date := make_date(EXTRACT(YEAR FROM CURRENT_DATE)::INT, 4, 1);  -- 1 Nisan
  v_end_date := make_date(EXTRACT(YEAR FROM CURRENT_DATE)::INT, 10, 31);  -- 31 Ekim
  
  -- Yeni tekne eklendiğinde otomatik takvim oluştur
  PERFORM generate_occupancy_for_boat(NEW.id, v_start_date, v_end_date);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Yeni tekne eklendiğinde otomatik takvim oluştur
CREATE TRIGGER trg_auto_occupancy_on_boat_insert
  AFTER INSERT ON boats
  FOR EACH ROW EXECUTE FUNCTION auto_generate_occupancy();

-- ========================  INITIAL DATA  ========================

-- Mevcut tekneler için takvim oluştur (ilk kurulumda çalıştır)
DO $$
DECLARE
  v_boat RECORD;
  v_start_date DATE := make_date(EXTRACT(YEAR FROM CURRENT_DATE)::INT, 4, 1);
  v_end_date DATE := make_date(EXTRACT(YEAR FROM CURRENT_DATE)::INT, 10, 31);
BEGIN
  FOR v_boat IN SELECT id FROM boats LOOP
    PERFORM generate_occupancy_for_boat(v_boat.id, v_start_date, v_end_date);
  END LOOP;
END $$;

-- ========================  COMMENTS  ========================

COMMENT ON TABLE boats IS 'Tekne filosu - özellikler, fiyat, galeri';
COMMENT ON TABLE occupancy_calendar IS 'Nisan-Ekim doluluk takvimi - günlük durum takibi';
COMMENT ON TABLE boat_bookings IS 'Tekne kiralama rezervasyonları - müşteri ve ödeme bilgileri';
COMMENT ON FUNCTION generate_occupancy_for_boat IS 'Belirli bir tekne için tarih aralığında takvim oluşturur';
COMMENT ON FUNCTION auto_generate_occupancy IS 'Yeni tekne eklendiğinde otomatik olarak Nisan-Ekim takvimini oluşturur';

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

-- WhatsApp Logs Table
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_sid VARCHAR(255) NOT NULL,
    voucher_no VARCHAR(100),
    phone_number VARCHAR(50) NOT NULL,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('outbound', 'inbound')),
    body TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Sadece super_admin ve admin görebilir
CREATE POLICY "Adminler tüm whatsapp loglarını görebilir"
ON public.whatsapp_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
  )
);

-- Sadece auth kullanıcılar veya service_role insert/update yapabilir (Webhooklar için genelde service_role kullanılır)
CREATE POLICY "Servis veya auth olanlar log ekleyebilir"
ON public.whatsapp_logs
FOR INSERT
WITH CHECK (true); -- Tüm girişlere izin ver (Webhooklar public olabilir, güvenlik kodu API tarafında kontrol edilir)

CREATE POLICY "Servis veya auth olanlar log güncelleyebilir"
ON public.whatsapp_logs
FOR UPDATE
USING (true);

-- Index for faster queries
CREATE INDEX idx_whatsapp_logs_message_sid ON public.whatsapp_logs(message_sid);
CREATE INDEX idx_whatsapp_logs_created_at ON public.whatsapp_logs(created_at DESC);

-- Push notification subscriptions table
-- Stores user push subscription details for sending notifications

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription JSONB NOT NULL, -- PushSubscription object
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Ensure one subscription per user
  UNIQUE(user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS push_subscriptions_user_id_idx ON push_subscriptions(user_id);

-- RLS Policies
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can only see and manage their own subscriptions
CREATE POLICY "push_subscriptions_select" ON push_subscriptions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_insert" ON push_subscriptions
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "push_subscriptions_update" ON push_subscriptions
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "push_subscriptions_delete" ON push_subscriptions
  FOR DELETE USING (user_id = auth.uid());

-- Admins can see all subscriptions (for sending notifications)
CREATE POLICY "push_subscriptions_admin_all" ON push_subscriptions
  FOR ALL USING (auth_user_role() IN ('super_admin', 'admin'));

-- Function to send push notification (placeholder)
-- This will be implemented as a Supabase Edge Function
COMMENT ON TABLE push_subscriptions IS 'Stores push notification subscriptions for web push notifications';
