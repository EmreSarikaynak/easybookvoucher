#!/bin/bash

# EasyBook Voucher Deployment Script
# Bu script deployment için gerekli dosyaları hazırlar

echo "🚀 EasyBook Voucher Deployment Hazırlanıyor..."
echo ""

# Renkler
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Build kontrolü
echo -e "${BLUE}📋 Adım 1: Build kontrol ediliyor...${NC}"
if [ ! -d ".next" ]; then
    echo -e "${YELLOW}⚠️  .next klasörü bulunamadı. Build oluşturuluyor...${NC}"
    npm run build
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Build başarısız! Lütfen hataları kontrol edin.${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✓ Build mevcut${NC}"
fi

# 2. Eski deploy dosyasını sil
echo ""
echo -e "${BLUE}📋 Adım 2: Eski deploy dosyası temizleniyor...${NC}"
if [ -f "easybookvoucher-deploy.zip" ]; then
    rm easybookvoucher-deploy.zip
    echo -e "${GREEN}✓ Eski deploy.zip silindi${NC}"
fi

# 3. Yeni ZIP oluştur
echo ""
echo -e "${BLUE}📋 Adım 3: Deployment ZIP dosyası oluşturuluyor...${NC}"
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
  -x "node_modules/*" ".next/*" ".git/*" ".DS_Store" "*.log" ".claude/*" ".gemini/*" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ ZIP dosyası oluşturuldu${NC}"
else
    echo -e "${RED}❌ ZIP oluşturulamadı!${NC}"
    exit 1
fi

# 4. Dosya boyutunu göster
echo ""
echo -e "${BLUE}📦 Dosya Bilgileri:${NC}"
ls -lh easybookvoucher-deploy.zip | awk '{print "   Boyut: " $5}'
echo -e "   İsim: easybookvoucher-deploy.zip"

# 5. İçerik listesi
echo ""
echo -e "${BLUE}📂 ZIP İçeriği:${NC}"
unzip -l easybookvoucher-deploy.zip | head -n 20

# 6. Tamamlandı
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN} ✅ Deployment dosyası hazır!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}📤 Sonraki Adımlar:${NC}"
echo "   1. easybookvoucher-deploy.zip dosyasını sunucuya yükle"
echo "   2. Sunucuda ZIP'i extract et"
echo "   3. npm install --production çalıştır"
echo "   4. npm run build çalıştır"
echo "   5. node server.js veya cPanel'den başlat"
echo ""
echo -e "${BLUE}📖 Detaylı bilgi için DEPLOYMENT_GUIDE.md dosyasını oku${NC}"
