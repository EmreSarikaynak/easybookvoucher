-- =============================================================
-- Mevcut Tabloları ve Tipleri Kontrol Et
-- =============================================================
-- Bu script veritabanınızdaki mevcut yapıyı kontrol eder
-- =============================================================

-- Enum tiplerini kontrol et
SELECT 
  'ENUM TİPLERİ' as kategori,
  t.typname as tip_adi,
  string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) as degerler
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname IN ('user_role', 'currency_type', 'voucher_status', 'payment_method')
GROUP BY t.typname
ORDER BY t.typname;

-- Tabloları kontrol et
SELECT 
  'TABLOLAR' as kategori,
  schemaname as schema,
  tablename as tablo_adi,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as boyut
FROM pg_tables
WHERE tablename IN ('agencies', 'profiles', 'tours', 'vouchers', 'voucher_templates', 'payments')
ORDER BY tablename;

-- Fonksiyonları kontrol et
SELECT 
  'FONKSİYONLAR' as kategori,
  routine_name as fonksiyon_adi,
  routine_type as tip
FROM information_schema.routines
WHERE routine_name IN ('handle_new_user', 'auth_user_role', 'auth_user_agency_id', 'update_updated_at')
  AND specific_schema = 'public'
ORDER BY routine_name;

-- Storage buckets kontrol et
SELECT 
  'STORAGE BUCKETS' as kategori,
  name as bucket_adi,
  public as genel_erisim
FROM storage.buckets
WHERE name = 'voucher-photos';
