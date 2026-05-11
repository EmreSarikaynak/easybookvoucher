-- =============================================================
-- EasyBook Voucher — Veritabanı Temizleme Script'i
-- =============================================================
-- DİKKAT: Bu script mevcut tüm tabloları ve verileri silecektir!
-- Sadece geliştirme ortamında kullanın!
-- =============================================================

-- Önce tabloları sil (bağımlılıklar nedeniyle sıralama önemli)
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS voucher_templates CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS tours CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS agencies CASCADE;

-- Fonksiyonları sil
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS auth_user_role() CASCADE;
DROP FUNCTION IF EXISTS auth_user_agency_id() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;

-- Enum tiplerini sil
DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS voucher_status CASCADE;
DROP TYPE IF EXISTS currency_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

-- Storage policies'leri sil (bucket'ı silmeden)
DROP POLICY IF EXISTS "voucher_photos_insert" ON storage.objects;
DROP POLICY IF EXISTS "voucher_photos_select" ON storage.objects;
DROP POLICY IF EXISTS "voucher_photos_delete" ON storage.objects;

SELECT 'Veritabanı başarıyla temizlendi! Şimdi schema.sql dosyasını çalıştırabilirsiniz.' as mesaj;
