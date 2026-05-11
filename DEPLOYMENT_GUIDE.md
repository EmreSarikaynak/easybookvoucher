# 🚀 EasyBook Voucher - Node.js Deployment Rehberi

## 📋 Gerekli Dosyalar ve Klasörler

### ✅ YÜKLENMESİ GEREKEN Dosya/Klasörler:

```
easybookvoucher/
├── .next/                    # ⚠️ Build sonrası oluşacak (npm run build)
├── node_modules/             # ⚠️ Sunucuda npm install ile kurulacak
├── public/                   # Statik dosyalar (resimler, favicon vs)
├── src/                      # Kaynak kodlar
├── .env.local               # ⚠️ Ortam değişkenleri (GİZLİ - el ile oluştur)
├── next.config.js           # Next.js konfigürasyonu
├── package.json             # Bağımlılıklar listesi
├── package-lock.json        # Bağımlılık kilidi
├── server.js                # Custom Node.js sunucu dosyası
├── tsconfig.json            # TypeScript konfigürasyonu
├── tailwind.config.ts       # Tailwind CSS konfigürasyonu
└── postcss.config.js        # PostCSS konfigürasyonu
```

### ❌ YÜKLENMEMESİ GEREKEN Dosya/Klasörler:

```
├── .git/                    # Git repository
├── .github/                 # GitHub ayarları
├── .claude/                 # Claude AI dosyaları
├── .gemini/                 # Gemini AI dosyaları
├── node_modules/            # ⚠️ Sunucuda yeniden kurulacak
├── .next/                   # ⚠️ Sunucuda yeniden build edilecek
├── .DS_Store                # Mac sistem dosyası
└── *.log                    # Log dosyaları
```

## 🔧 Deployment Adımları

### Adım 1: Lokal'de Build Oluştur

```bash
cd /Users/emresarikaynak/Desktop/easybookvoucher

# Bağımlılıkları yükle (eğer yüklenmediyse)
npm install

# Production build oluştur
npm run build

# Build başarılı mı kontrol et
ls -la .next/
```

### Adım 2: Dosyaları Sıkıştır (ZIP)

```bash
# Gerekli dosyaları ZIP'le (node_modules ve .next hariç)
zip -r easybookvoucher-deploy.zip \
  src/ \
  public/ \
  .env.local \
  next.config.js \
  package.json \
  package-lock.json \
  server.js \
  tsconfig.json \
  tailwind.config.ts \
  postcss.config.js \
  -x "node_modules/*" ".next/*" ".git/*" ".DS_Store"
```

VEYA manuel olarak şu klasörleri seçip ZIP'le:
- `src/`
- `public/`
- `.env.local`
- `next.config.js`
- `package.json`
- `package-lock.json`
- `server.js`
- `tsconfig.json`
- `tailwind.config.ts`
- `postcss.config.js`

### Adım 3: Sunucuya Yükle

#### cPanel için:
1. **File Manager** aç
2. Hedef klasöre git (örn: `public_html/easybookvoucher/`)
3. ZIP dosyasını yükle
4. ZIP'i sağ tıklayıp **Extract** et
5. ZIP dosyasını sil

#### SSH/FTP için:
```bash
# SCP ile yükle
scp easybookvoucher-deploy.zip user@yourserver.com:/path/to/app/

# SSH ile bağlan ve extract et
ssh user@yourserver.com
cd /path/to/app/
unzip easybookvoucher-deploy.zip
```

### Adım 4: Sunucuda Kurulum

```bash
# SSH ile sunucuya bağlan
ssh user@yourserver.com

# Uygulama klasörüne git
cd /path/to/app/easybookvoucher/

# Node.js sürümünü kontrol et (16.x veya 18.x olmalı)
node --version

# Bağımlılıkları kur
npm install --production

# Build oluştur (sunucuda)
npm run build

# Sunucuyu başlat
node server.js
```

### Adım 5: cPanel Node.js App Ayarları

**cPanel → Setup Node.js App** bölümünde:

- **Node.js version:** 18.x veya 16.x
- **Application mode:** Production
- **Application root:** `easybookvoucher` (veya tam path)
- **Application URL:** `yourdomain.com` veya subdomain
- **Application startup file:** `server.js`
- **Environment variables:** 
  ```
  NODE_ENV=production
  PORT=3000
  ```

## 🔐 Environment Variables (.env.local)

Sunucuda `.env.local` dosyasını manuel olarak oluştur:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Diğer değişkenler...
```

## ✅ Kontrol Listesi

- [ ] `npm run build` başarılı
- [ ] `.env.local` dosyası sunucuda oluşturuldu
- [ ] `node_modules/` sunucuda kuruldu
- [ ] `.next/` klasörü sunucuda build edildi
- [ ] `server.js` doğru çalışıyor
- [ ] Domain/subdomain doğru ayarlandı
- [ ] Port açık ve erişilebilir

## 🔄 Güncelleme (Update) Adımları

Kod değişiklikleri yaptıktan sonra:

```bash
# 1. Lokal'de yeni build
npm run build

# 2. src/, public/ ve değişen dosyaları ZIP'le
zip -r update.zip src/ public/ next.config.js

# 3. Sunucuya yükle ve extract et

# 4. Sunucuda yeniden build et
npm run build

# 5. Uygulamayı yeniden başlat
# cPanel: "Restart" butonuna tıkla
# veya SSH ile:
pm2 restart easybookvoucher
# veya
pkill -f "node server.js" && node server.js &
```

## 📞 Sorun Giderme

### Uygulama Başlamıyor
```bash
# Log'ları kontrol et
tail -f logs/error.log

# Port kullanımda mı?
netstat -tulpn | grep :3000

# Node.js sürümü uygun mu?
node --version
```

### Build Hataları
```bash
# Cache'i temizle
rm -rf .next/
rm -rf node_modules/
npm install
npm run build
```

### Environment Variables Yüklenmiyor
- `.env.local` dosyasının doğru yerde olduğundan emin ol
- Dosya ismi doğru mu? (`.env.local` tam olarak bu şekilde)
- Restart yaptın mı?

## 📁 Minimal Gerekli Dosya Listesi

Sadece bu dosyalar olmadan uygulama çalışmaz:

```
✓ package.json
✓ package-lock.json
✓ next.config.js
✓ server.js
✓ src/ klasörü (tamamı)
✓ public/ klasörü (logo vs varsa)
✓ .env.local
✓ tsconfig.json
✓ tailwind.config.ts
✓ postcss.config.js
```

## 🎯 Hızlı Deploy Komutu

Tüm adımları tek komutta:

```bash
#!/bin/bash
# deploy.sh

echo "📦 Building..."
npm run build

echo "🗜️ Compressing..."
zip -r deploy.zip src/ public/ *.js *.json *.ts .env.local \
  -x "node_modules/*" ".next/*" ".git/*"

echo "✅ deploy.zip hazır! Sunucuya yükleyebilirsin."
echo "📤 Dosya boyutu:"
du -h deploy.zip
```

Kullanım:
```bash
chmod +x deploy.sh
./deploy.sh
```
