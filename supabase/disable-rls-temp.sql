-- =============================================================
-- GEÇİCİ: RLS'yi Kapat (Sadece Geliştirme İçin)
-- =============================================================
-- UYARI: Bu sadece sorunu tespit etmek için!
-- Sorun çözüldükten sonra RLS'yi tekrar açacağız
-- =============================================================

-- Profiles tablosunda RLS'yi geçici olarak kapat
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

SELECT 'RLS geçici olarak kapatıldı. Şimdi uygulamayı test edin.' as mesaj;

-- Test için: Profiles tablosunu sorgula
SELECT 
  id, 
  email, 
  full_name, 
  role,
  is_active
FROM profiles 
WHERE id = '84ff5f55-4ad1-4a06-a318-0ada730ccc61';
