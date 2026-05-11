-- =========================================================================
-- EKSİK SÜTUNLARI EKLEME SCRİPTİ
--
-- Sorun: Raporlar sayfasında veriler yüklenemiyordu çünkü biletlerde 
-- acente ödeme durumu ve tarihi alanları (agency_payment_status ve agency_payment_date) 
-- veritabanı şemasında mevcut değildi.
-- =========================================================================

ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS agency_payment_status TEXT DEFAULT 'pending';
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS agency_payment_date TIMESTAMPTZ;

-- PostgREST şema önbelleğini zorla yenile (opsiyonel ancak faydalı)
NOTIFY pgrst, 'reload schema';
