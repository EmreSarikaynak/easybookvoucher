# CLAUDE.md — EasyBook Voucher Yönetim Sistemi

## Proje Özeti

EasyBook Tours Bodrum için voucher yönetim sistemi. Tur şirketi sahada kağıt voucher kesiyor; voucher fotoğrafı çekilip sisteme kaydediliyor ve OCR ile otomatik alan okuma yapılıyor. Sistem admin, acente ve satıcı rollerini destekler. Çoklu para birimi (TL, EUR, USD, GBP) ile çalışır. Arayüz Türkçe'dir.

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Frontend | Next.js 14 (App Router) + TypeScript + Tailwind CSS |
| Backend | Supabase (Auth, Database, Storage) |
| OCR | Tesseract.js (başlangıç aşaması) |
| PWA | next-pwa veya @serwist/next (mobil uygulama deneyimi) |
| PDF | jsPDF veya @react-pdf/renderer |
| Dil | Türkçe arayüz (i18n altyapısı opsiyonel) |

## Komutlar

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusu
npm run dev

# Üretim derlemesi
npm run build

# Üretim sunucusu
npm start

# Lint kontrolü
npm run lint

# Tipleri kontrol et
npx tsc --noEmit
```

## Proje Yapısı (Hedef)

```
easybookvoucher/
├── public/
│   ├── icons/              # PWA ikonları
│   └── manifest.json       # PWA manifest
├── src/
│   ├── app/                # Next.js App Router
│   │   ├── layout.tsx      # Root layout
│   │   ├── page.tsx        # Ana sayfa (login)
│   │   ├── dashboard/      # Dashboard sayfaları
│   │   ├── vouchers/       # Voucher CRUD sayfaları
│   │   │   ├── page.tsx    # Voucher listeleme
│   │   │   ├── new/        # Yeni voucher ekleme
│   │   │   └── [id]/       # Voucher detay/düzenleme
│   │   ├── reports/        # Raporlama sayfaları
│   │   ├── users/          # Kullanıcı yönetimi (admin)
│   │   └── api/            # API Route Handlers
│   ├── components/         # Paylaşılan bileşenler
│   │   ├── ui/             # Temel UI bileşenleri (Button, Input, Modal vb.)
│   │   ├── voucher/        # Voucher'a özel bileşenler
│   │   ├── layout/         # Header, Sidebar, Footer
│   │   └── ocr/            # OCR bileşenleri
│   ├── lib/                # Yardımcı kütüphaneler
│   │   ├── supabase/       # Supabase client & helpers
│   │   ├── ocr/            # OCR işlem mantığı
│   │   └── pdf/            # PDF üretim mantığı
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript tip tanımları
│   ├── utils/              # Genel yardımcı fonksiyonlar
│   └── constants/          # Sabitler (para birimleri, roller vb.)
├── supabase/
│   ├── migrations/         # Veritabanı migration dosyaları
│   └── seed.sql            # Test verileri
├── CLAUDE.md               # Bu dosya
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Veritabanı Şeması (Supabase/PostgreSQL)

### Tablolar

**profiles** — Kullanıcı profilleri (Supabase Auth ile bağlantılı)
- `id` (uuid, PK, auth.users referansı)
- `email` (text)
- `full_name` (text)
- `role` (enum: admin, acente, satici)
- `agency_name` (text, nullable — acente adı)
- `phone` (text, nullable)
- `is_active` (boolean, default true)
- `created_at`, `updated_at` (timestamptz)

**vouchers** — Voucher kayıtları
- `id` (uuid, PK)
- `voucher_no` (text, unique — voucher seri numarası)
- `guest_name` (text — misafir adı)
- `tour_name` (text — tur adı)
- `tour_date` (date — tur tarihi)
- `pax_adult` (integer — yetişkin sayısı)
- `pax_child` (integer — çocuk sayısı)
- `sale_price` (numeric — satış fiyatı)
- `currency` (enum: TRY, EUR, USD, GBP)
- `commission_rate` (numeric, nullable — komisyon oranı %)
- `hotel_name` (text, nullable — otel adı)
- `room_no` (text, nullable)
- `phone` (text, nullable — misafir telefonu)
- `notes` (text, nullable)
- `photo_url` (text, nullable — voucher fotoğrafı Storage URL)
- `ocr_raw_text` (text, nullable — OCR ham çıktısı)
- `status` (enum: draft, confirmed, cancelled)
- `created_by` (uuid, FK → profiles.id)
- `agency_id` (uuid, FK → profiles.id, nullable)
- `created_at`, `updated_at` (timestamptz)

**tours** — Tur tanımları
- `id` (uuid, PK)
- `name` (text)
- `base_price` (numeric)
- `currency` (enum: TRY, EUR, USD, GBP)
- `is_active` (boolean, default true)

**commissions** — Acente komisyon tanımları
- `id` (uuid, PK)
- `agency_id` (uuid, FK → profiles.id)
- `tour_id` (uuid, FK → tours.id)
- `rate` (numeric — komisyon oranı %)

### Row Level Security (RLS)

- **Admin**: Tüm verilere tam erişim
- **Acente**: Yalnızca kendi acentesine ait voucher'ları görür/düzenler
- **Satıcı**: Yalnızca kendi oluşturduğu voucher'ları görür, düzenleyemez

## Kullanıcı Rolleri

| Rol | Yetkiler |
|-----|----------|
| **admin** | Tüm CRUD işlemleri, kullanıcı yönetimi, raporlar, tur/komisyon tanımları |
| **acente** | Kendi acentesinin voucher'larını görme/ekleme, kendi raporları |
| **satici** | Voucher ekleme (fotoğraf + form), kendi eklediği voucher'ları görme |

## Ana Özellikler

### 1. Kullanıcı Yönetimi
- Supabase Auth ile email/şifre girişi
- Profil tablosu ile rol yönetimi
- Admin panelinden kullanıcı ekleme/düzenleme/deaktif etme

### 2. Voucher Ekleme (Fotoğraf + Form)
- Kameradan fotoğraf çekme veya galeriden seçme
- Fotoğraf Supabase Storage'a yükleme
- OCR ile otomatik alan doldurma (misafir adı, tur, fiyat vb.)
- Manuel form doldurma/düzeltme
- Voucher durumu: taslak → onaylı → iptal

### 3. Voucher Listeleme ve Filtreleme
- Tarih aralığı, tur adı, acente, durum filtresi
- Arama (misafir adı, voucher no)
- Sıralama (tarih, fiyat, tur)
- Sayfalama

### 4. Raporlar
- Günlük/haftalık/aylık satış özeti
- Acente bazlı satış raporu
- Tur bazlı satış raporu
- Komisyon hesaplama raporu
- Para birimi bazlı toplamlar

### 5. Online Voucher Tasarlama ve PDF Üretimi
- Şablon tabanlı voucher tasarımı
- Logo, şirket bilgileri, QR kod
- PDF olarak indirme/paylaşma

### 6. OCR ile Alan Okuma
- Tesseract.js ile client-side OCR
- Fotoğraftan metin çıkarma
- Çıkarılan metinden alanları parse etme (regex + heuristik)
- Gelecekte: AI destekli akıllı alan eşleştirme

## Kodlama Kuralları

- **Dil**: Kod ve değişkenler İngilizce, UI metinleri Türkçe
- **Bileşen yapısı**: Fonksiyonel bileşenler + React hooks
- **State yönetimi**: React Context veya Zustand (gerekirse)
- **Form**: React Hook Form + Zod validation
- **Stil**: Tailwind CSS utility-first, shadcn/ui bileşen kütüphanesi tercih edilir
- **Dosya adlandırma**: kebab-case (voucher-list.tsx), bileşenler PascalCase export
- **Tip güvenliği**: Strict TypeScript, `any` kullanımından kaçın
- **Supabase client**: Server component'lerde `createServerClient`, client component'lerde `createBrowserClient`
- **Hata yönetimi**: try/catch ile Supabase hatalarını yakala, kullanıcıya Türkçe hata mesajı göster
- **Tarih/saat**: `date-fns` kütüphanesi, Türkiye saat dilimi (Europe/Istanbul)

## Ortam Değişkenleri

```env
NEXT_PUBLIC_SUPABASE_URL=<supabase-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<supabase-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<supabase-service-role-key>  # Yalnızca sunucu tarafı
```

## Geliştirme Notları

- PWA desteği için manifest.json ve service worker yapılandırması gerekli
- Fotoğraf yükleme için Supabase Storage bucket: `voucher-photos`
- OCR işlemi client-side çalışır, sunucuya ham metin kaydedilir
- Mobilde kamera erişimi HTTPS gerektirir (localhost hariç)
- Supabase migration'ları `supabase/migrations/` altında tutulur
