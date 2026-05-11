-- =============================================================
-- Profile Kaydı Ekle - secesta@easybook.local
-- =============================================================

-- Önce kontrol et, var mı?
SELECT 
  id, 
  email, 
  full_name, 
  role,
  is_active
FROM profiles 
WHERE id = '84ff5f55-4ad1-4a06-a318-0ada730ccc61';

-- Eğer yukarıdaki sorgu boş dönerse (kayıt yoksa), aşağıdakini çalıştır:

INSERT INTO profiles (id, email, full_name, role, is_active)
VALUES (
  '84ff5f55-4ad1-4a06-a318-0ada730ccc61', 
  'secesta@easybook.local', 
  'EasyBook Admin', 
  'admin', 
  true
)
ON CONFLICT (id) DO UPDATE
SET 
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active;

-- Kontrol et
SELECT 
  id, 
  email, 
  full_name, 
  role,
  is_active,
  created_at
FROM profiles 
WHERE id = '84ff5f55-4ad1-4a06-a318-0ada730ccc61';

SELECT 'Profile kaydı başarıyla eklendi!' as mesaj;
