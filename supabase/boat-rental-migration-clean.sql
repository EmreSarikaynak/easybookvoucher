  -- =============================================================
  -- BOAT RENTAL SYSTEM - MINIMAL MIGRATION
  -- =============================================================
  -- Sadece yeni tabloları ve gerekli yapıları ekler
  -- Mevcut enum'ları kullanır (schema.sql'den)
  -- =============================================================

  -- ======================== SADECE YENİ ENUM'LAR ========================

  -- boat_status_type
  DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'boat_status_type') THEN
          CREATE TYPE boat_status_type AS ENUM ('active', 'maintenance', 'inactive');
          RAISE NOTICE '✅ boat_status_type oluşturuldu';
      ELSE
          RAISE NOTICE 'ℹ️  boat_status_type zaten mevcut';
      END IF;
  END $$;

  -- occupancy_status_type
  DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'occupancy_status_type') THEN
          CREATE TYPE occupancy_status_type AS ENUM ('available', 'booked', 'pending', 'blocked');
          RAISE NOTICE '✅ occupancy_status_type oluşturuldu';
      ELSE
          RAISE NOTICE 'ℹ️  occupancy_status_type zaten mevcut';
      END IF;
  END $$;

  -- ======================== TABLOLAR ========================

  -- boats tablosu
  CREATE TABLE IF NOT EXISTS boats (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    specifications  JSONB NOT NULL DEFAULT '{"length_meters": 0, "capacity_max": 0, "crew_count": 0, "equipment": []}',
    base_price      NUMERIC(10,2) NOT NULL DEFAULT 0,
    currency        currency_type NOT NULL DEFAULT 'EUR',
    gallery         TEXT[] DEFAULT '{}',
    status          boat_status_type NOT NULL DEFAULT 'active',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  -- boat_bookings tablosu
  CREATE TABLE IF NOT EXISTS boat_bookings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    boat_id         UUID NOT NULL REFERENCES boats(id) ON DELETE RESTRICT,
    booking_date    DATE NOT NULL,
    customer_info   JSONB NOT NULL DEFAULT '{"name": "", "phone": "", "email": "", "guests": 0}',
    payment_details JSONB NOT NULL DEFAULT '{"total": 0, "paid": 0, "remaining": 0, "currency": "EUR"}',
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

  -- occupancy_calendar tablosu
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

  RAISE NOTICE '✅ Tablolar oluşturuldu';

  -- ======================== İNDEKSLER ========================

  CREATE INDEX IF NOT EXISTS idx_boats_status ON boats (status) WHERE status = 'active';
  CREATE INDEX IF NOT EXISTS idx_occupancy_boat_date ON occupancy_calendar (boat_id, date);
  CREATE INDEX IF NOT EXISTS idx_occupancy_date_range ON occupancy_calendar (date);
  CREATE INDEX IF NOT EXISTS idx_occupancy_status ON occupancy_calendar (status);
  CREATE INDEX IF NOT EXISTS idx_bookings_boat ON boat_bookings (boat_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_date ON boat_bookings (booking_date);
  CREATE INDEX IF NOT EXISTS idx_bookings_agency ON boat_bookings (agency_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_sales ON boat_bookings (sales_person_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_status ON boat_bookings (status);

  RAISE NOTICE '✅ İndeksler oluşturuldu';

  -- ======================== TRİGGERLAR ========================

  DROP TRIGGER IF EXISTS trg_boats_updated_at ON boats;
  CREATE TRIGGER trg_boats_updated_at BEFORE UPDATE ON boats
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

  DROP TRIGGER IF EXISTS trg_bookings_updated_at ON boat_bookings;
  CREATE TRIGGER trg_bookings_updated_at BEFORE UPDATE ON boat_bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

  DROP TRIGGER IF EXISTS trg_occupancy_updated_at ON occupancy_calendar;
  CREATE TRIGGER trg_occupancy_updated_at BEFORE UPDATE ON occupancy_calendar
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

  RAISE NOTICE '✅ Trigger''lar oluşturuldu';

  -- ======================== RLS POLİTİKALARI ========================

  ALTER TABLE boats ENABLE ROW LEVEL SECURITY;
  ALTER TABLE occupancy_calendar ENABLE ROW LEVEL SECURITY;
  ALTER TABLE boat_bookings ENABLE ROW LEVEL SECURITY;

  -- boats policies
  DROP POLICY IF EXISTS "boats_select" ON boats;
  CREATE POLICY "boats_select" ON boats FOR SELECT 
    USING (status = 'active' OR auth_user_role() IN ('super_admin', 'admin', 'agency_admin'));

  DROP POLICY IF EXISTS "boats_insert" ON boats;
  CREATE POLICY "boats_insert" ON boats FOR INSERT 
    WITH CHECK (auth_user_role() IN ('super_admin', 'admin', 'agency_admin'));

  DROP POLICY IF EXISTS "boats_update" ON boats;
  CREATE POLICY "boats_update" ON boats FOR UPDATE 
    USING (auth_user_role() IN ('super_admin', 'admin', 'agency_admin'));

  DROP POLICY IF EXISTS "boats_delete" ON boats;
  CREATE POLICY "boats_delete" ON boats FOR DELETE 
    USING (auth_user_role() IN ('super_admin', 'admin'));

  -- occupancy_calendar policies
  DROP POLICY IF EXISTS "occupancy_select" ON occupancy_calendar;
  CREATE POLICY "occupancy_select" ON occupancy_calendar FOR SELECT USING (TRUE);

  DROP POLICY IF EXISTS "occupancy_insert" ON occupancy_calendar;
  CREATE POLICY "occupancy_insert" ON occupancy_calendar FOR INSERT 
    WITH CHECK (auth_user_role() IN ('super_admin', 'admin', 'agency_admin', 'sales'));

  DROP POLICY IF EXISTS "occupancy_update" ON occupancy_calendar;
  CREATE POLICY "occupancy_update" ON occupancy_calendar FOR UPDATE 
    USING (auth_user_role() IN ('super_admin', 'admin', 'agency_admin'));

  DROP POLICY IF EXISTS "occupancy_delete" ON occupancy_calendar;
  CREATE POLICY "occupancy_delete" ON occupancy_calendar FOR DELETE 
    USING (auth_user_role() IN ('super_admin', 'admin', 'agency_admin'));

  -- boat_bookings policies
  DROP POLICY IF EXISTS "bookings_select" ON boat_bookings;
  CREATE POLICY "bookings_select" ON boat_bookings FOR SELECT USING (
    auth_user_role() IN ('super_admin', 'admin')
    OR (auth_user_role() = 'agency_admin' AND agency_id = auth_user_agency_id())
    OR (auth_user_role() = 'sales' AND sales_person_id = auth.uid())
  );

  DROP POLICY IF EXISTS "bookings_insert" ON boat_bookings;
  CREATE POLICY "bookings_insert" ON boat_bookings FOR INSERT 
    WITH CHECK (auth_user_role() IN ('super_admin', 'admin', 'agency_admin', 'sales'));

  DROP POLICY IF EXISTS "bookings_update" ON boat_bookings;
  CREATE POLICY "bookings_update" ON boat_bookings FOR UPDATE USING (
    auth_user_role() IN ('super_admin', 'admin')
    OR (auth_user_role() = 'agency_admin' AND agency_id = auth_user_agency_id())
  );

  DROP POLICY IF EXISTS "bookings_delete" ON boat_bookings;
  CREATE POLICY "bookings_delete" ON boat_bookings FOR DELETE 
    USING (auth_user_role() IN ('super_admin', 'admin'));

  RAISE NOTICE '✅ RLS politikaları oluşturuldu';

  -- ======================== STORAGE BUCKET ========================

  INSERT INTO storage.buckets (id, name, public)
  VALUES ('boat-photos', 'boat-photos', TRUE)
  ON CONFLICT (id) DO NOTHING;

  RAISE NOTICE '✅ Storage bucket oluşturuldu';

  -- ======================== FONKSİYONLAR ========================

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

  CREATE OR REPLACE FUNCTION auto_generate_occupancy()
  RETURNS TRIGGER AS $$
  DECLARE
    v_start_date DATE;
    v_end_date DATE;
  BEGIN
    v_start_date := make_date(EXTRACT(YEAR FROM CURRENT_DATE)::INT, 4, 1);
    v_end_date := make_date(EXTRACT(YEAR FROM CURRENT_DATE)::INT, 10, 31);
    PERFORM generate_occupancy_for_boat(NEW.id, v_start_date, v_end_date);
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;

  DROP TRIGGER IF EXISTS trg_auto_occupancy_on_boat_insert ON boats;
  CREATE TRIGGER trg_auto_occupancy_on_boat_insert
    AFTER INSERT ON boats
    FOR EACH ROW EXECUTE FUNCTION auto_generate_occupancy();

  RAISE NOTICE '✅ Fonksiyonlar ve trigger''lar oluşturuldu';

  -- ======================== REALTIME ========================

  DO $$ BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE occupancy_calendar;
      RAISE NOTICE '✅ Realtime etkinleştirildi';
  EXCEPTION
      WHEN duplicate_object THEN 
          RAISE NOTICE 'ℹ️  Realtime zaten etkin';
      WHEN undefined_object THEN 
          RAISE NOTICE '⚠️  Realtime publication bulunamadı (normal olabilir)';
  END $$;

  -- ======================== BAŞARI MESAJI ========================

  DO $$ 
  BEGIN
      RAISE NOTICE '';
      RAISE NOTICE '🎉🎉🎉 MİGRASYON BAŞARILI! 🎉🎉🎉';
      RAISE NOTICE '';
      RAISE NOTICE '✅ Oluşturulan tablolar:';
      RAISE NOTICE '   • boats';
      RAISE NOTICE '   • boat_bookings';
      RAISE NOTICE '   • occupancy_calendar';
      RAISE NOTICE '';
      RAISE NOTICE '📝 Test teknesi eklemek için:';
      RAISE NOTICE '   INSERT INTO boats (name, specifications, base_price, currency)';
      RAISE NOTICE '   VALUES (''Gökbilim Gulet'',';
      RAISE NOTICE '           ''{"length_meters": 24, "capacity_max": 12, "crew_count": 3, "equipment": ["Şnorkel"]}'',';
      RAISE NOTICE '           500, ''EUR'');';
      RAISE NOTICE '';
  END $$;
