import type { HelpArticle } from "./types";

export const HELP_ARTICLES: HelpArticle[] = [
  {
    slug: "baslangic",
    title: "Başlangıç",
    category: "Genel",
    summary:
      "Sisteme giriş, kullanıcı rolleri ve ana menünün kısa tanıtımı.",
    sections: [
      {
        title: "Giriş yapma",
        paragraphs: [
          "Tarayıcınızdan panele gidin ve e-posta veya kullanıcı adınız ile şifrenizi girin.",
          "İlk girişten sonra mobil cihazlarda uygulamayı ana ekrana eklemeniz ve bildirim izni vermeniz önerilir (Ayarlar ve PWA rehberine bakın).",
        ],
      },
      {
        title: "Kullanıcı rolleri",
        paragraphs: [
          "Admin: Tüm acenteleri, kullanıcıları, turları, maliyetleri ve sistem ayarlarını yönetir.",
          "Acente yöneticisi / satış: Kendi acentesine ait biletleri keser, turları ve kataloğu görür, destek talebi açar.",
          "Her rol menüde yalnızca yetkili olduğu sayfaları görür; eksik menü görüyorsanız yöneticinize başvurun.",
        ],
      },
      {
        title: "Ana menü özeti",
        paragraphs: [
          "Dashboard: Günlük özet ve hızlı erişim.",
          "Biletler / Yeni Bilet: Rezervasyon oluşturma ve listeleme.",
          "Turlar ve Tur Kataloğu: Tur tanımları ve müşteriye gönderilebilir fiyatlı katalog.",
          "Duyurular: Şirket içi kayan yazı ve push bildirimleri.",
          "Destek Talepleri: Teknik veya operasyonel yardım isteği.",
          "Ayarlar: Profil, bildirimler, logo ve admin WhatsApp numarası (admin).",
        ],
      },
    ],
  },
  {
    slug: "bilet-islemleri",
    title: "Bilet kesme ve düzenleme",
    category: "Biletler",
    summary:
      "Yeni bilet, düzenleme, iptal, PDF/JPEG oluşturma ve otomatik WhatsApp gönderimi.",
    sections: [
      {
        title: "Yeni bilet kesme",
        paragraphs: [
          "Menüden Yeni Bilet'e girin. Tur, tarih, misafir bilgileri, otel, kişi sayısı ve fiyat alanlarını doldurun.",
          "Telefon numarasını ülke kodu ile doğru girin; WhatsApp gönderimi bu numaraya yapılır.",
          "Kaydettikten sonra bilet detay sayfasına yönlendirilirsiniz; PDF ve WhatsApp işlemleri burada otomatik başlar.",
        ],
        tips: [
          "Yeni bilet URL'sinde ?new=1 parametresi varsa otomatik PDF üretimi ve WhatsApp tetiklenir.",
        ],
      },
      {
        title: "Otomatik PDF ve WhatsApp",
        paragraphs: [
          "Bilet kaydedildikten sonra sistem bilet görselini (JPEG) ve PDF'i oluşturur, depolamaya yükler.",
          "Ardından müşteriye, acenteye ve admine (ayarlardaki numara + EasyBook dahili numara) ayrı mesaj metinleriyle bildirim gider.",
          "Mesajda PDF linki ve mümkünse bilet görseli bulunur. Gönderim durumunu bilet sayfasındaki banner'dan takip edin.",
        ],
        tips: [
          "WhatsApp 24 saat kuralı: Müşteri daha önce sizinle yazışmadıysa şablon mesajı kullanılır; link her zaman metinde yer alır.",
        ],
      },
      {
        title: "Bilet düzenleme",
        paragraphs: [
          "Bilet listesinden veya detaydan Düzenle'ye tıklayın. Değişiklikleri kaydedince revize akışı çalışır (?revised=1).",
          "Güncel PDF yeniden üretilir ve ilgili taraflara revize bildirimi gider.",
        ],
      },
      {
        title: "İptal ve silme",
        paragraphs: [
          "Acente kullanıcıları bileti iptal edebilir (pasif durum); silme yetkisi yoktur.",
          "Admin bileti kalıcı olarak silebilir veya iptalden tekrar aktif edebilir.",
        ],
        adminOnly: true,
      },
      {
        title: "Manuel PDF indirme",
        paragraphs: [
          "Bilet detayında TR veya EN PDF butonları ile önizleme dilini seçip PDF indirebilirsiniz.",
          "Otomatik gönderim başarısız olursa PDF linkini kopyalayıp WhatsApp'tan manuel paylaşabilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "turlar",
    title: "Tur yönetimi",
    category: "Turlar",
    summary:
      "Tur ekleme, çok dilli içerik, kalkış bilgileri ve katalog arkaplan görseli.",
    sections: [
      {
        title: "Tur listesi",
        paragraphs: [
          "Turlar menüsünden aktif ve pasif turları görürsünüz. Acenteler yalnızca aktif turları görür.",
          "Tur Kataloğu kısayolu ile fiyatlı PDF kataloğa geçebilirsiniz.",
        ],
      },
      {
        title: "Yeni tur ve düzenleme (Admin)",
        paragraphs: [
          "Admin yeni tur ekler: ad, süre, açıklama, görseller, alış noktaları ve çeviriler (TR, EN, RU, PL).",
          "Çeviri sekmelerinde tur adı, açıklama, program maddeleri, dahil / dahil olmayan listeleri ve detaylar girilir.",
          "Kalkış günleri (haftanın günleri), kalkış saati ve buluşma noktası PDF katalogda kullanılır.",
          "Katalog A4 arkaplanı: İsteğe bağlı dikey görsel; PDF'te sayfa başına 2 tur varken üstteki turun arkaplanı kullanılır.",
        ],
        adminOnly: true,
      },
      {
        title: "Tek tur PDF",
        paragraphs: [
          "Tur kartından veya tur detayından müşteriye gönderilebilir tek tur PDF'i (TR/EN) indirilebilir.",
        ],
      },
    ],
  },
  {
    slug: "tur-katalogu",
    title: "Tur kataloğu",
    category: "Turlar",
    summary:
      "Tüm turlar için EUR satış fiyatları, çok dilli PDF ve müşteriye WhatsApp.",
    sections: [
      {
        title: "Fiyat matrisi",
        paragraphs: [
          "Tur Kataloğu sayfasında her tur için Yetişkin EUR ve Çocuk EUR sütunlarını doldurun.",
          "Admin acente seçerek o acentenin fiyatlarını düzenler; acente yalnızca kendi fiyatlarını görür.",
          "Kaydetmeden PDF indirme veya WhatsApp gönderimi yapılamaz; kaydedilmemiş satırlar uyarı verir.",
        ],
      },
      {
        title: "PDF indirme",
        paragraphs: [
          "Türkçe, İngilizce veya Rusça PDF butonları ile güncel kayıtlı fiyatlarla katalog indirilir.",
          "PDF'te turlar kompakt kartlar halinde; fotoğraf solda, bilgi ve fiyat sağda listelenir.",
        ],
      },
      {
        title: "Müşteriye WhatsApp",
        paragraphs: [
          "Müşteri telefonu ve mesaj dilini seçin; Kataloğu WhatsApp ile Gönder'e basın.",
          "Sistem PDF'i sunucuda üretir, depolar ve seçilen dilde mesaj + link gönderir.",
        ],
      },
      {
        title: "Önizleme",
        paragraphs: [
          "Sayfanın altındaki kart önizlemesi seçilen dile göre tur adı ve fiyatları gösterir; PDF ile tutarlı kontrol için kullanın.",
        ],
      },
    ],
  },
  {
    slug: "whatsapp",
    title: "WhatsApp bildirimleri",
    category: "İletişim",
    summary:
      "Bilet ve katalog mesajları, alıcılar ve sık karşılaşılan durumlar.",
    sections: [
      {
        title: "Bilet sonrası otomatik mesajlar",
        paragraphs: [
          "Müşteri: Türkçe veya İngilizce (telefon ülke koduna göre); mesajda bilet özeti ve PDF/görsel linki.",
          "Acente: Acente perspektifinden özet + link.",
          "Admin: Operasyonel detay (otel, alış, PAX, müşteri wa.me linki) + link.",
          "EasyBook dahili numarası her yeni bilette bilgilendirilir; ayarlardaki admin numarası farklıysa o da eklenir.",
        ],
      },
      {
        title: "Görsel ve PDF",
        paragraphs: [
          "Öncelik JPEG bilet görseli ek dosya olarak gider; başarısız olursa yalnızca metin + link gönderilir.",
          "PDF linki her zaman mesaj gövdesinde tıklanabilir şekilde yer alır.",
        ],
      },
      {
        title: "24 saat penceresi",
        paragraphs: [
          "WhatsApp Business, son 24 saatte yazışılmamış numaralara serbest medya kısıtı uygulayabilir.",
          "Bu durumda onaylı şablon mesajı devreye girer; link yine mesajda bulunur.",
        ],
      },
      {
        title: "WhatsApp logları (Admin)",
        paragraphs: [
          "Menüden WhatsApp Logları ile giden mesajların durumunu (queued, delivered, failed) inceleyebilirsiniz.",
        ],
        adminOnly: true,
      },
    ],
  },
  {
    slug: "duyurular",
    title: "Duyurular ve bildirimler",
    category: "İletişim",
    summary:
      "Admin duyuruları, dashboard kayan yazı ve push bildirimleri.",
    sections: [
      {
        title: "Duyuru yayınlama (Admin)",
        paragraphs: [
          "Ayarlar bölümündeki Duyurular panelinden başlık, mesaj, hedef kitle (tümü / acente / admin) ve süre girilir.",
          "İsteğe bağlı push bildirimi gönderilir; süre dolunca duyuru dashboard kayan yazısından kalkar.",
        ],
        adminOnly: true,
      },
      {
        title: "Dashboard kayan yazı",
        paragraphs: [
          "Aktif duyurular giriş yapmış kullanıcıların dashboard üstünde kayan bant olarak görünür.",
        ],
      },
      {
        title: "Push bildirimleri",
        paragraphs: [
          "Kullanıcılar Ayarlar'dan bildirim izni verir ve aboneliği yeniler.",
          "PWA olarak yüklenmiş cihazlarda bildirimler uygulama kapalıyken de gelebilir.",
        ],
      },
    ],
  },
  {
    slug: "destek",
    title: "Destek talepleri",
    category: "Destek",
    summary:
      "Acentelerin talep açması ve admin yanıtı.",
    sections: [
      {
        title: "Talep oluşturma",
        paragraphs: [
          "Destek Talepleri menüsünden konu ve açıklama yazarak yeni talep açın.",
          "Talep durumu açık / yanıtlandı / kapalı olarak takip edilir.",
        ],
      },
      {
        title: "Admin yanıtı",
        paragraphs: [
          "Admin tüm talepleri görür, yanıt yazar ve durumu günceller.",
        ],
        adminOnly: true,
      },
    ],
  },
  {
    slug: "pwa",
    title: "Uygulama yükleme ve bildirimler",
    category: "Mobil",
    summary:
      "Telefona PWA ekleme ve push bildirim izni.",
    sections: [
      {
        title: "Uygulamayı yükleme",
        paragraphs: [
          "Android/Chrome: Giriş sonrası çıkan banner veya Ayarlar'daki Uygulamayı Yükle.",
          "iOS/Safari: Paylaş → Ana Ekrana Ekle (manuel adımlar ekranda gösterilir).",
        ],
      },
      {
        title: "Bildirim izni",
        paragraphs: [
          "Bildirimleri Aç uyarısını onaylayın; reddettiyseniz tarayıcı ayarlarından site için bildirime izin verin.",
          "Ayarlar'da Aboneliği Yenile ile push kaydı güncellenir.",
        ],
      },
    ],
  },
  {
    slug: "itur-fiyat",
    title: "iTur Fiyat ve maliyetler",
    category: "Fiyatlandırma",
    summary:
      "Admin taban maliyetleri ve acente satış fiyatları.",
    sections: [
      {
        title: "Tur Maliyetleri (Admin)",
        paragraphs: [
          "Admin Tur Maliyetleri sayfasında her tur için taban yetişkin/çocuk EUR ve TRY maliyetlerini girer.",
          "Bu değerler acente fiyat ekranlarında varsayılan olarak referans alınabilir.",
        ],
        adminOnly: true,
      },
      {
        title: "Acente iTur Fiyat",
        paragraphs: [
          "Acente menüsünde iTur Fiyat ile kendi satış maliyet/fiyat tablosunu görür ve düzenler (yetkiye göre).",
          "Tur Kataloğu'ndaki EUR satış fiyatları ayrı kaydedilir (agency_tour_prices); katalog PDF bu fiyatları kullanır.",
        ],
      },
      {
        title: "PDF ve WhatsApp (maliyet raporu)",
        paragraphs: [
          "Tur Maliyetleri sayfasından tüm maliyetleri PDF indirebilir veya acente telefonuna WhatsApp ile gönderebilirsiniz.",
        ],
      },
    ],
  },
  {
    slug: "raporlar",
    title: "Raporlar",
    category: "Raporlama",
    summary:
      "Satış ve performans özet ekranı.",
    sections: [
      {
        title: "Raporlar menüsü",
        paragraphs: [
          "Raporlar sayfasından tarih ve filtrelerle bilet/satış özetlerini inceleyebilirsiniz.",
          "Admin tüm acenteleri; acente kullanıcıları yalnızca kendi verilerini görür.",
        ],
      },
    ],
  },
  {
    slug: "admin-panel",
    title: "Admin işlemleri",
    category: "Admin",
    summary:
      "Acenteler, kullanıcılar, filo, operasyon, ayarlar ve loglar.",
    sections: [
      {
        title: "Acenteler",
        paragraphs: [
          "Yeni acente oluşturma, kod, iletişim bilgileri ve aktif/pasif durumu.",
        ],
        adminOnly: true,
      },
      {
        title: "Kullanıcılar",
        paragraphs: [
          "Kullanıcı davet etme, rol atama (admin, acente yöneticisi, satış) ve acente bağlama.",
        ],
        adminOnly: true,
      },
      {
        title: "Filo ve operasyon",
        paragraphs: [
          "Filo Yönetimi: Tekne/araç kayıtları.",
          "Operasyon Takvimi: Günlük operasyon planı.",
          "Tekne Kiralamaları: Kiralama rezervasyonları.",
        ],
        adminOnly: true,
      },
      {
        title: "Sistem ayarları",
        paragraphs: [
          "Ayarlar: Site logosu, admin WhatsApp numarası, döviz kurları, duyuru yönetimi, push test.",
          "Cloudflare ortam değişkenlerinde Twilio ve VAPID anahtarları tanımlı olmalıdır (teknik ekip).",
        ],
        adminOnly: true,
      },
    ],
  },
];

export function getArticleBySlug(slug: string): HelpArticle | undefined {
  return HELP_ARTICLES.find((a) => a.slug === slug);
}

export function getAllArticleSlugs(): string[] {
  return HELP_ARTICLES.map((a) => a.slug);
}

export const HELP_CATEGORIES = [
  "Genel",
  "Biletler",
  "Turlar",
  "İletişim",
  "Destek",
  "Mobil",
  "Fiyatlandırma",
  "Raporlama",
  "Admin",
] as const;
