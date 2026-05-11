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
