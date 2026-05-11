# Supabase Schema Kurulum Talimatları

Bu dosya, EasyBook Voucher sisteminin veritabanı şemasını Supabase projenize yükleme adımlarını içerir.

## Adım 1: Supabase Dashboard'a Giriş

1. Tarayıcınızda [https://supabase.com/dashboard](https://supabase.com/dashboard) adresine gidin
2. Projenizi seçin (URL: https://yjxsnudpiknohrxxgyra.supabase.co)

## Adım 2: SQL Editor'ü Açın

1. Sol menüden **SQL Editor** sekmesine tıklayın
2. Sağ üstteki **New Query** butonuna tıklayın

## Adım 3: Schema'yı Yükleyin

1. `supabase/schema.sql` dosyasının tüm içeriğini kopyalayın
2. SQL Editor'e yapıştırın
3. Sağ alttaki **Run** (veya Ctrl/Cmd + Enter) butonuna tıklayın
4. İşlem tamamlanana kadar bekleyin (30-60 saniye sürebilir)

### Beklenen Çıktı

Başarılı olursa aşağıdaki gibi bir mesaj görmelisiniz:

```
Success. No rows returned
```

## Adım 4: Tabloları Kontrol Edin

1. Sol menüden **Table Editor** sekmesine gidin
2. Aşağıdaki tabloların oluşturulduğunu doğrulayın:
   - ✅ agencies
   - ✅ profiles
   - ✅ tours
   - ✅ vouchers
   - ✅ voucher_templates
   - ✅ payments

## Adım 5: Storage Bucket'ını Kontrol Edin

1. Sol menüden **Storage** sekmesine gidin
2. `voucher-photos` bucket'ının oluşturulduğunu doğrulayın

## Adım 6: Test Kullanıcısı Oluşturun

### 6a. Authentication Kullanıcısı Ekleyin

1. Sol menüden **Authentication** > **Users** sekmesine gidin
2. **Add user** butonuna tıklayın
3. Email ve şifre girin (örn: admin@test.com / test123456)
4. **Create User** butonuna tıklayın
5. Oluşturulan kullanıcının **User ID** (UUID) değerini kopyalayın

### 6b. Profile Kaydı Oluşturun

Schema'daki `handle_new_user()` trigger'ı otomatik olarak profile kaydı oluşturmalıdır. Ancak eğer manuel olarak eklemek isterseniz:

1. **SQL Editor**'e gidin
2. Aşağıdaki SQL'i çalıştırın (USER_ID yerine kopyaladığınız UUID'yi yapıştırın):

```sql
-- Profili kontrol et
SELECT * FROM profiles WHERE id = 'USER_ID_BURAYA';

-- Eğer yoksa, manuel olarak ekle:
INSERT INTO profiles (id, email, full_name, role, is_active)
VALUES (
  'USER_ID_BURAYA', 
  'admin@test.com', 
  'Admin Kullanıcı', 
  'admin', 
  true
);
```

## Adım 7: Test Verileri Ekleyin (Opsiyonel)

Test için örnek veriler eklemek isterseniz `supabase/seed.sql` dosyasını SQL Editor'de çalıştırın.

## Sorun Giderme

### Hata: "relation does not exist"

Bu hata, schema henüz yüklenmemiş demektir. Adım 3'ü tekrar yapın.

### Hata: "permission denied"

RLS (Row Level Security) politikaları yüzünden olabilir. Service Role Key kullanıyor olduğunuzdan emin olun.

### Tabloları Silip Yeniden Oluşturmak

Eğer tabloları silip yeniden oluşturmak isterseniz:

```sql
-- DİKKAT: Bu komut tüm verileri siler!
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS voucher_templates CASCADE;
DROP TABLE IF EXISTS vouchers CASCADE;
DROP TABLE IF EXISTS tours CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;
DROP TABLE IF EXISTS agencies CASCADE;

DROP TYPE IF EXISTS payment_method CASCADE;
DROP TYPE IF EXISTS voucher_status CASCADE;
DROP TYPE IF EXISTS currency_type CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

DROP FUNCTION IF EXISTS handle_new_user CASCADE;
DROP FUNCTION IF EXISTS auth_user_role CASCADE;
DROP FUNCTION IF EXISTS auth_user_agency_id CASCADE;
DROP FUNCTION IF EXISTS update_updated_at CASCADE;
```

Sonra `schema.sql` dosyasını tekrar çalıştırın.

## Sonraki Adımlar

Schema başarıyla yüklendikten sonra:

1. Uygulamayı yeniden başlatın: `npm run dev`
2. Tarayıcıda `http://localhost:3000` adresine gidin
3. Oluşturduğunuz test kullanıcısı ile giriş yapın
4. `/vouchers` sayfasına gidin ve çalıştığını doğrulayın

## Yardım

Sorun yaşarsanız tarayıcı console'unu (F12) açın ve hata mesajlarını kontrol edin.
