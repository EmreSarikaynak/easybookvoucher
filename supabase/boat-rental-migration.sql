-- =============================================================
-- BOAT RENTAL SYSTEM MIGRATION
-- =============================================================
-- Bu dosyayı Supabase SQL Editor'de çalıştırın
-- Tarih: 2026-02-01
-- =============================================================

-- ========================  1. YENİ ENUM TİPLERİ  ========================
-- NOT: user_role, currency_type, voucher_status zaten ana schema.sql'de var
-- Sadece tekne sistemine özel enum'ları ekliyoruz

DO $$ BEGIN
    CREATE TYPE boat_status_type AS ENUM ('active', 'maintenance', 'inactive');
    RAISE NOTICE 'boat_status_type enum oluşturuldu';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'boat_status_type zaten mevcut, atlanıyor';
END $$;

DO $$ BEGIN
    CREATE TYPE occupancy_status_type AS ENUM ('available', 'booked', 'pending', 'blocked');
    RAISE NOTICE 'occupancy_status_type enum oluşturuldu';
EXCEPTION
    WHEN duplicate_object THEN 
        RAISE NOTICE 'occupancy_status_type zaten mevcut, atlanıyor';
END $$;

-- ========================  2. YENİ TABLOLAR  ========================

-- 2.1 boats — Tekne filosu
CREATE TABLE IF NOT EXISTS boats (
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
  gallery         TEXT[] DEFAULT '{}',
  status          boat_status_type NOT NULL DEFAULT 'active',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.2 boat_bookings — Tekne kiralama rezervasyonları
CREATE TABLE IF NOT EXISTS boat_bookings (
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
  captain_info    JSONB DEFAULT NULL,
  extras          JSONB DEFAULT NULL,
  departure_port  TEXT,
  agency_id       UUID REFERENCES agencies(id) ON DELETE SET NULL,
  sales_person_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  status          voucher_status NOT NULL DEFAULT 'active',
  notes           TEXT,
  pdf_url         TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2.3 occupancy_calendar — Nisan-Ekim doluluk takvimi
CREATE TABLE IF NOT EXISTS occupancy_calendar (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  boat_id     UUID NOT NULL REFERENCES boats(id) ON DELETE CASCADE,
  date        DATE NOT NULL,
  status      occupancy_status_type NOT NULL DEFAULT 'available',
  booking_id  UUID REFERENCES boat_bookings(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(boat_id, date)
);

-- ========================  3. İNDEKSLER  ========================

CREATE INDEX IF NOT EXISTS idx_boats_status ON boats (status) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_occupancy_boat_date ON occupancy_calendar (boat_id, date);
CREATE INDEX IF NOT EXISTS idx_occupancy_date_range ON occupancy_calendar (date);
CREATE INDEX IF NOT EXISTS idx_occupancy_status ON occupancy_calendar (status);
CREATE INDEX IF NOT EXISTS idx_bookings_boat ON boat_bookings (boat_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON boat_bookings (booking_date);
CREATE INDEX IF NOT EXISTS idx_bookings_agency ON boat_bookings (agency_id);
CREATE INDEX IF NOT EXISTS idx_bookings_sales ON boat_bookings (sales_person_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON boat_bookings (status);

-- ========================  4. TRİGGERLAR  ========================

-- Trigger: Auto-update updated_at on boats
DROP TRIGGER IF EXISTS trg_boats_updated_at ON boats;
CREATE TRIGGER trg_boats_updated_at
  BEFORE UPDATE ON boats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: Auto-update updated_at on boat_bookings
DROP TRIGGER IF EXISTS trg_bookings_updated_at ON boat_bookings;
CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON boat_bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Trigger: Auto-update updated_at on occupancy_calendar
DROP TRIGGER IF EXISTS trg_occupancy_updated_at ON occupancy_calendar;
CREATE TRIGGER trg_occupancy_updated_at
  BEFORE UPDATE ON occupancy_calendar
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================  5. ROW LEVEL SECURITY  ========================

ALTER TABLE boats ENABLE ROW LEVEL SECURITY;
ALTER TABLE occupancy_calendar ENABLE ROW LEVEL SECURITY;
ALTER TABLE boat_bookings ENABLE ROW LEVEL SECURITY;

-- ---------- boats RLS Policies ----------

DROP POLICY IF EXISTS "boats_select" ON boats;
CREATE POLICY "boats_select" ON boats FOR SELECT USING (
  status = 'active' OR auth_user_role() IN ('super_admin', 'admin', 'agency_admin')
);

DROP POLICY IF EXISTS "boats_insert" ON boats;
CREATE POLICY "boats_insert" ON boats FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin', 'agency_admin')
);

DROP POLICY IF EXISTS "boats_update" ON boats;
CREATE POLICY "boats_update" ON boats FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin', 'agency_admin')
);

DROP POLICY IF EXISTS "boats_delete" ON boats;
CREATE POLICY "boats_delete" ON boats FOR DELETE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

-- ---------- occupancy_calendar RLS Policies ----------

DROP POLICY IF EXISTS "occupancy_select" ON occupancy_calendar;
CREATE POLICY "occupancy_select" ON occupancy_calendar FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "occupancy_insert" ON occupancy_calendar;
CREATE POLICY "occupancy_insert" ON occupancy_calendar FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin', 'agency_admin', 'sales')
);

DROP POLICY IF EXISTS "occupancy_update" ON occupancy_calendar;
CREATE POLICY "occupancy_update" ON occupancy_calendar FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin', 'agency_admin')
);

DROP POLICY IF EXISTS "occupancy_delete" ON occupancy_calendar;
CREATE POLICY "occupancy_delete" ON occupancy_calendar FOR DELETE USING (
  auth_user_role() IN ('super_admin', 'admin', 'agency_admin')
);

-- ---------- boat_bookings RLS Policies ----------

DROP POLICY IF EXISTS "bookings_select" ON boat_bookings;
CREATE POLICY "bookings_select" ON boat_bookings FOR SELECT USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR (auth_user_role() = 'agency_admin' AND agency_id = auth_user_agency_id())
  OR (auth_user_role() = 'sales' AND sales_person_id = auth.uid())
);

DROP POLICY IF EXISTS "bookings_insert" ON boat_bookings;
CREATE POLICY "bookings_insert" ON boat_bookings FOR INSERT WITH CHECK (
  auth_user_role() IN ('super_admin', 'admin', 'agency_admin', 'sales')
);

DROP POLICY IF EXISTS "bookings_update" ON boat_bookings;
CREATE POLICY "bookings_update" ON boat_bookings FOR UPDATE USING (
  auth_user_role() IN ('super_admin', 'admin')
  OR (auth_user_role() = 'agency_admin' AND agency_id = auth_user_agency_id())
);

DROP POLICY IF EXISTS "bookings_delete" ON boat_bookings;
CREATE POLICY "bookings_delete" ON boat_bookings FOR DELETE USING (
  auth_user_role() IN ('super_admin', 'admin')
);

-- ========================  6. STORAGE BUCKET  ========================

-- Tekne fotoğrafları için Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('boat-photos', 'boat-photos', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
DO $$ BEGIN
    DROP POLICY IF EXISTS "boat_photos_insert" ON storage.objects;
    CREATE POLICY "boat_photos_insert" ON storage.objects FOR INSERT
      WITH CHECK (
        bucket_id = 'boat-photos' 
        AND auth_user_role() IN ('super_admin', 'admin', 'agency_admin')
      );
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "boat_photos_select" ON storage.objects;
    CREATE POLICY "boat_photos_select" ON storage.objects FOR SELECT
      USING (bucket_id = 'boat-photos');
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "boat_photos_delete" ON storage.objects;
    CREATE POLICY "boat_photos_delete" ON storage.objects FOR DELETE
      USING (
        bucket_id = 'boat-photos' 
        AND auth_user_role() IN ('super_admin', 'admin')
      );
EXCEPTION
    WHEN undefined_table THEN null;
END $$;

-- ========================  7. HELPER FONKSİYONLAR  ========================

-- Fonksiyon: Belirli bir tarih aralığı için takvim oluştur
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

-- Fonksiyon: Yeni tekne eklendiğinde otomatik takvim oluştur
CREATE OR REPLACE FUNCTION auto_generate_occupancy()
RETURNS TRIGGER AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
BEGIN
  -- Mevcut yılın Nisan-Ekim aralığı
  v_start_date := make_date(EXTRACT(YEAR FROM CURRENT_DATE)::INT, 4, 1);
  v_end_date := make_date(EXTRACT(YEAR FROM CURRENT_DATE)::INT, 10, 31);
  
  -- Yeni tekne için takvim oluştur
  PERFORM generate_occupancy_for_boat(NEW.id, v_start_date, v_end_date);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Yeni tekne eklendiğinde takvim oluştur
DROP TRIGGER IF EXISTS trg_auto_occupancy_on_boat_insert ON boats;
CREATE TRIGGER trg_auto_occupancy_on_boat_insert
  AFTER INSERT ON boats
  FOR EACH ROW EXECUTE FUNCTION auto_generate_occupancy();

-- ========================  8. REALTIME YAYIN  ========================

-- Occupancy calendar için Realtime etkinleştir
DO $$ BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE occupancy_calendar;
EXCEPTION
    WHEN duplicate_object THEN null;
    WHEN undefined_object THEN null;
END $$;

-- ========================  9. TABLO YORUMLARI  ========================

COMMENT ON TABLE boats IS 'Tekne filosu - özellikler, fiyat, galeri';
COMMENT ON TABLE occupancy_calendar IS 'Nisan-Ekim doluluk takvimi - günlük durum takibi';
COMMENT ON TABLE boat_bookings IS 'Tekne kiralama rezervasyonları - müşteri ve ödeme bilgileri';
COMMENT ON COLUMN boats.specifications IS 'JSONB: {length_meters, capacity_max, crew_count, equipment[]}';
COMMENT ON COLUMN boat_bookings.customer_info IS 'JSONB: {name, phone, email, guests}';
COMMENT ON COLUMN boat_bookings.payment_details IS 'JSONB: {total, paid, remaining, currency}';
COMMENT ON COLUMN boat_bookings.captain_info IS 'JSONB: {name, license}';
COMMENT ON COLUMN boat_bookings.extras IS 'JSONB: {food, fuel_included, notes}';

-- ========================  10. BAŞLANGIÇ VERİSİ (OPSİYONEL)  ========================

-- Mevcut tekneler için takvim oluştur (varsa)
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

-- ========================  MİGRASYON TAMAMLANDI  ========================

-- Kontrol sorguları (opsiyonel - sonuçları görmek için)
DO $$ 
BEGIN
    RAISE NOTICE '✅ Migration başarılı!';
    RAISE NOTICE 'Oluşturulan tablolar:';
    RAISE NOTICE '  - boats';
    RAISE NOTICE '  - boat_bookings';
    RAISE NOTICE '  - occupancy_calendar';
    RAISE NOTICE '';
    RAISE NOTICE 'Şimdi test teknesi ekleyebilirsiniz:';
    RAISE NOTICE 'INSERT INTO boats (name, specifications, base_price, currency) VALUES (''Test Tekne'', ''{"length_meters": 20, "capacity_max": 10, "crew_count": 2, "equipment": ["Şnorkel"]}'', 400, ''EUR'');';
END $$;
