-- =============================================================
-- EasyBook Voucher — Test Verileri (Seed Data)
-- =============================================================
-- Bu dosya geliştirme ve test ortamı için örnek veriler içerir.
-- Önce schema.sql dosyasını çalıştırdığınızdan emin olun!
-- =============================================================

-- ========================  ACENTELER  ========================

INSERT INTO agencies (id, name, address, phone, email, commission_rate, is_active)
VALUES 
  (gen_random_uuid(), 'Sunshine Travel', 'Bodrum Marina, Muğla', '+90 252 123 4567', 'info@sunshinetravel.com', 10.00, true),
  (gen_random_uuid(), 'Blue Voyage Tours', 'Gümbet Mah. Bodrum', '+90 252 234 5678', 'contact@bluevoyage.com', 12.00, true),
  (gen_random_uuid(), 'Aegean Adventures', 'Bitez, Bodrum', '+90 252 345 6789', 'hello@aegeanadv.com', 8.00, true);

-- ========================  TURLAR  ========================

INSERT INTO tours (id, name, description, default_price, currency, duration, pickup_locations, is_active)
VALUES 
  (gen_random_uuid(), 'Pamukkale Turu', 'Pamukkale ve Hierapolis antik kenti ziyareti. Termal havuzlar ve travertenler.', 50.00, 'EUR', 'Tam Gün', ARRAY['Bodrum Merkez', 'Gümbet', 'Bitez', 'Turgutreis'], true),
  (gen_random_uuid(), 'Tekne Turu', '5 adada mavi tur. Öğle yemeği dahil. Yüzme ve snorkeling.', 35.00, 'EUR', 'Tam Gün', ARRAY['Bodrum Marina', 'Gümbet', 'Bitez'], true),
  (gen_random_uuid(), 'Efes Turu', 'Efes antik kenti, Meryem Ana Evi ve Şirince köyü gezisi.', 55.00, 'EUR', 'Tam Gün', ARRAY['Bodrum Merkez', 'Gümbet', 'Turgutreis'], true),
  (gen_random_uuid(), 'Dalyan Turu', 'Dalyan Çayı tekne turu, Kaunos antik kenti, Kaplumbağa Plajı ve çamur banyosu.', 45.00, 'EUR', 'Tam Gün', ARRAY['Bodrum Merkez', 'Gümbet', 'Bitez'], true),
  (gen_random_uuid(), 'Jeep Safari', 'Dağ köylerinde macera turu. Öğle yemeği dahil.', 40.00, 'EUR', 'Tam Gün', ARRAY['Bodrum Merkez', 'Gümbet', 'Bitez', 'Turgutreis'], true),
  (gen_random_uuid(), 'Balık Avı Turu', 'Özel tekne ile balık avı deneyimi. Avlanan balıklar pişirilir.', 60.00, 'EUR', 'Yarım Gün', ARRAY['Bodrum Marina'], true),
  (gen_random_uuid(), 'Bodrum Şehir Turu', 'Bodrum Kalesi, Antik Tiyatro ve Myndos Kapısı gezisi.', 25.00, 'EUR', 'Yarım Gün', ARRAY['Bodrum Merkez', 'Gümbet'], true);

-- ========================  NOT  ========================
-- 
-- MANUEL ADIMLAR GEREKLİ:
-- 
-- 1. Önce Supabase Dashboard → Authentication → Users bölümünden
--    bir test kullanıcısı oluşturun (örn: admin@test.com)
-- 
-- 2. Oluşturulan kullanıcının User ID'sini (UUID) kopyalayın
-- 
-- 3. Aşağıdaki SQL'de '<USER_ID_BURAYA>' yazan yerleri
--    gerçek User ID ile değiştirin
-- 
-- 4. Bu dosyayı SQL Editor'de çalıştırın
-- 
-- ========================  ÖRNEK VOUCHER'LAR  ========================

-- ÖNEMLİ: Aşağıdaki SQL'i çalıştırmadan önce:
-- 1. Authentication'dan bir kullanıcı oluşturun
-- 2. User ID'yi kopyalayın
-- 3. '<USER_ID_BURAYA>' kısmını o ID ile değiştirin

/*

-- Önce kullanıcı ID'lerini ve tur ID'lerini değişkenlere atayalım
DO $$
DECLARE
  v_user_id UUID;
  v_agency1_id UUID;
  v_tour1_id UUID;
  v_tour2_id UUID;
  v_tour3_id UUID;
BEGIN
  -- KENDİ USER ID'NİZİ BURAYA YAZIN:
  v_user_id := '<USER_ID_BURAYA>'::UUID;
  
  -- Rastgele bir acente seç
  SELECT id INTO v_agency1_id FROM agencies ORDER BY random() LIMIT 1;
  
  -- İlk 3 turu seç
  SELECT id INTO v_tour1_id FROM tours WHERE name LIKE '%Pamukkale%' LIMIT 1;
  SELECT id INTO v_tour2_id FROM tours WHERE name LIKE '%Tekne%' LIMIT 1;
  SELECT id INTO v_tour3_id FROM tours WHERE name LIKE '%Efes%' LIMIT 1;
  
  -- Örnek voucher'ları ekle
  INSERT INTO vouchers (
    voucher_no, tour_id, tour_date, customer_name, hotel, room_no,
    pax_adult, pax_child, pax_infant, pickup_place, pickup_time,
    total_price, currency, deposit_paid, sales_person_id, agency_id, status, notes
  ) VALUES
    (
      'EB-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-001',
      v_tour1_id,
      CURRENT_DATE + INTERVAL '3 days',
      'John Smith',
      'Hilton Bodrum',
      '205',
      2, 1, 0,
      'Hilton Bodrum Lobby',
      '07:30',
      120.00, 'EUR', 50.00,
      v_user_id, v_agency1_id, 'active',
      'Çocuk 8 yaşında. Özel diyet talebi yok.'
    ),
    (
      'EB-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-002',
      v_tour2_id,
      CURRENT_DATE + INTERVAL '5 days',
      'Maria Garcia',
      'Royal Bodrum Resort',
      'A-312',
      2, 0, 0,
      'Royal Bodrum Ana Giriş',
      '09:00',
      70.00, 'EUR', 70.00,
      v_user_id, v_agency1_id, 'active',
      'Balık alerjisi var.'
    ),
    (
      'EB-' || to_char(CURRENT_DATE, 'YYYYMMDD') || '-003',
      v_tour3_id,
      CURRENT_DATE + INTERVAL '7 days',
      'Hans Müller',
      'Kempinski Hotel',
      '501',
      4, 2, 1,
      'Kempinski Ana Kapı',
      '08:00',
      300.00, 'EUR', 100.00,
      v_user_id, v_agency1_id, 'active',
      'Büyük aile grubu. Bebek arabası gerekli.'
    ),
    (
      'EB-' || to_char(CURRENT_DATE - INTERVAL '2 days', 'YYYYMMDD') || '-099',
      v_tour1_id,
      CURRENT_DATE - INTERVAL '2 days',
      'Emma Johnson',
      'Voyage Bodrum',
      '123',
      2, 0, 0,
      'Voyage Bodrum Resepsiyon',
      '07:45',
      100.00, 'EUR', 100.00,
      v_user_id, v_agency1_id, 'completed',
      'Tur başarıyla tamamlandı. Çok memnun kaldılar.'
    ),
    (
      'EB-' || to_char(CURRENT_DATE - INTERVAL '5 days', 'YYYYMMDD') || '-088',
      v_tour2_id,
      CURRENT_DATE - INTERVAL '5 days',
      'Ahmed Al-Said',
      'Mandarin Oriental',
      '702',
      3, 1, 0,
      'Mandarin Ana Giriş',
      '09:15',
      140.00, 'USD', 60.00,
      v_user_id, v_agency1_id, 'cancelled',
      'Müşteri kötü hava koşulları nedeniyle iptal etti. Para iadesi yapıldı.'
    );

  RAISE NOTICE 'Örnek voucher verileri başarıyla eklendi!';
END $$;

*/

-- ========================  KULLANIM TALİMATI  ========================
--
-- Yukarıdaki yorumlu (/* ... */) SQL bloğunu kopyalayın
-- '<USER_ID_BURAYA>' yazan yeri kendi User ID'nizle değiştirin
-- Sonra SQL Editor'de çalıştırın
--
-- =====================================================================

SELECT 'Acenteler ve turlar başarıyla eklendi! Voucher eklemek için yukarıdaki talimatları takip edin.' as mesaj;
