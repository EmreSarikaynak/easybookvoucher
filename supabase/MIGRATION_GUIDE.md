# Supabase Migration Talimatları

## 🎯 Boat Rental System Migration

Bu dosya, tekne kiralama sistemini Supabase veritabanınıza eklemek için tüm gerekli SQL komutlarını içerir.

---

## 📋 Adım Adım Kurulum

### 1️⃣ Supabase Dashboard'a Giriş

1. [Supabase Dashboard](https://app.supabase.com) adresine gidin
2. Projenizi seçin
3. Sol menüden **SQL Editor**'ü açın

---

### 2️⃣ Migration SQL'i Çalıştırın

**Seçenek A: Dosyayı Yükleyin**

1. SQL Editor'de **"New query"** butonuna tıklayın
2. Aşağıdaki dosyayı açın ve içeriğini kopyalayın:
   - [`boat-rental-migration.sql`](file:///Users/emresarikaynak/Desktop/easybookvoucher/supabase/boat-rental-migration.sql)
3. SQL Editor'e yapıştırın
4. **"Run"** (Çalıştır) butonuna tıklayın

**Seçenek B: Terminal'den Çalıştırın** (Supabase CLI kuruluysa)

```bash
cd /Users/emresarikaynak/Desktop/easybookvoucher

# Migration'ı çalıştır
supabase db execute -f supabase/boat-rental-migration.sql
```

---

### 3️⃣ Migration Kontrolü

Migration başarılı olduysa şu mesajı göreceksiniz:

```
✅ Migration başarılı!
Oluşturulan tablolar:
  - boats
  - boat_bookings
  - occupancy_calendar
```

**Manuel Kontrol**:

1. Supabase Dashboard → **Table Editor**'e gidin
2. Sol tarafta şu tabloları görmelisiniz:
   - ✅ `boats`
   - ✅ `boat_bookings`
   - ✅ `occupancy_calendar`

---

### 4️⃣ Realtime'ı Aktifleştirin (Opsiyonel ama Tavsiye Edilir)

Takvimin canlı güncellenmesi için:

1. Dashboard → **Database** → **Replication**
2. `occupancy_calendar` tablosunu bulun
3. **Realtime** toggle'ını **ON** yapın

---

## 🧪 Test Verisi Ekleme

Migration tamamlandıktan sonra test için bir tekne ekleyin:

### SQL ile Test Teknesi Ekle:

```sql
-- Test teknesi ekle
INSERT INTO boats (name, specifications, base_price, currency, gallery, status)
VALUES (
  'Gökbilim Gulet',
  '{
    "length_meters": 24,
    "capacity_max": 12,
    "crew_count": 3,
    "equipment": ["Şnorkel Ekipmanı", "Ses Sistemi", "Buzdolabı", "Duş", "WC"]
  }'::jsonb,
  500.00,
  'EUR',
  ARRAY['https://picsum.photos/seed/boat1/800/600'],
  'active'
);
```

**Beklenen Sonuç**:
- ✅ Tekne `boats` tablosuna eklenir
- ✅ Otomatik olarak Nisan-Ekim arası ~214 gün için `occupancy_calendar` kayıtları oluşturulur (trigger sayesinde)

---

## 🔍 Kontrol Sorguları

### Tabloları Kontrol Et:

```sql
-- Tüm tekneleri listele
SELECT id, name, base_price, currency, status FROM boats;

-- Takvim kayıtlarını kontrol et
SELECT 
  b.name, 
  COUNT(*) as gun_sayisi
FROM occupancy_calendar oc
JOIN boats b ON b.id = oc.boat_id
GROUP BY b.name;
```

**Beklenen çıktı**: Her tekne için ~214 gün

---

### Boş Günleri Kontrol Et:

```sql
SELECT 
  b.name as tekne,
  oc.date as tarih,
  oc.status as durum
FROM occupancy_calendar oc
JOIN boats b ON b.id = oc.boat_id
WHERE oc.status = 'available'
ORDER BY oc.date
LIMIT 10;
```

---

## 📊 Oluşturulan Yapılar

### Tablolar

| Tablo | Satır Sayısı (Örnek) | Açıklama |
|-------|---------------------|----------|
| `boats` | 1-20 | Tekne filosu |
| `occupancy_calendar` | 214+ | Her tekne için Nisan-Ekim takvimi |
| `boat_bookings` | 0 | Rezervasyon kayıtları (başlangıçta boş) |

### Enum Tipleri

- `boat_status_type`: active, maintenance, inactive
- `occupancy_status_type`: available, booked, pending, blocked

### Storage Bucket

- **`boat-photos`**: Tekne fotoğrafları için public bucket

### Fonksiyonlar

- `generate_occupancy_for_boat()`: Manuel takvim oluşturma
- `auto_generate_occupancy()`: Otomatik takvim trigger'ı

### Row Level Security (RLS)

✅ Tüm tablolarda RLS aktif
- Admin/Agency Admin: Tam yetki
- Sales: Sadece kendi kayıtlarını görebilir

---

## ⚠️ Sorun Giderme

### Hata: "relation already exists"

**Açıklama**: Tablo zaten var  
**Çözüm**: Normal, migration `IF NOT EXISTS` kullanıyor, devam edebilir

---

### Hata: "column does not exist"

**Açıklama**: Ana `schema.sql` çalıştırılmamış olabilir  
**Çözüm**: 
1. Önce `schema.sql` dosyasını çalıştırın
2. Sonra `boat-rental-migration.sql` dosyasını çalıştırın

---

### Hata: "permission denied"

**Açıklama**: Supabase service role yetkisi gerekiyor  
**Çözüm**: SQL Editor'de çalıştırırken problem olmamalı. CLI kullanıyorsanız:

```bash
supabase db execute -f boat-rental-migration.sql --local
```

---

## ✅ Migration Sonrası

Migration tamamlandıktan sonra:

1. ✅ Dev sunucuyu yeniden başlatın: `npm run dev`
2. ✅ Şu sayfaları ziyaret edin:
   - `http://localhost:3000/fleet` - Filo Yönetimi
   - `http://localhost:3000/operations` - Operasyon Takvimi
   - `http://localhost:3000/bookings` - Rezervasyonlar
3. ✅ Test teknesi eklediğinizde, Fleet sayfasında görünmeli

---

## 📞 Destek

Herhangi bir sorun yaşarsanız:

1. Supabase Dashboard → **Logs** kısmından hata mesajlarını kontrol edin
2. SQL Editor'de sorguları tek tek çalıştırarak hatayı izole edin
3. Browser Console'da JavaScript hatalarını kontrol edin

---

## 🎉 Başarılı!

Migration tamamlandığında sistemde şunlar hazır olacak:

✅ 3 yeni tablo (boats, bookings, calendar)  
✅ RLS politikaları  
✅ Otomatik takvim oluşturma  
✅ Realtime güncellemeler  
✅ Storage bucket  

Artık tekne eklemeye ve rezervasyon almaya başlayabilirsiniz! 🚢
