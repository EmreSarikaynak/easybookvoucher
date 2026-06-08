-- Kullanım rehberi / footer sayfaları (admin yönetir, herkes yayında olanları okur)
create table if not exists public.help_pages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  category text not null default 'Genel',
  summary text not null default '',
  sections jsonb not null default '[]'::jsonb,
  sort_order int not null default 0,
  show_in_footer boolean not null default false,
  footer_group text null check (footer_group in ('featured', 'quick')),
  is_published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists help_pages_sort_order_idx on public.help_pages (sort_order);
create index if not exists help_pages_published_idx on public.help_pages (is_published) where is_published = true;
create index if not exists help_pages_footer_idx on public.help_pages (show_in_footer, footer_group) where show_in_footer = true;

create or replace function public.set_help_pages_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists help_pages_updated_at on public.help_pages;
create trigger help_pages_updated_at
  before update on public.help_pages
  for each row execute function public.set_help_pages_updated_at();

alter table public.help_pages enable row level security;

drop policy if exists "Anyone can read published help pages" on public.help_pages;
create policy "Anyone can read published help pages" on public.help_pages
  for select
  to anon, authenticated
  using (is_published = true);

drop policy if exists "Admins can read all help pages" on public.help_pages;
create policy "Admins can read all help pages" on public.help_pages
  for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin')
    )
  );

drop policy if exists "Only admins can insert help pages" on public.help_pages;
create policy "Only admins can insert help pages" on public.help_pages
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin')
    )
  );

drop policy if exists "Only admins can update help pages" on public.help_pages;
create policy "Only admins can update help pages" on public.help_pages
  for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin')
    )
  )
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin')
    )
  );

drop policy if exists "Only admins can delete help pages" on public.help_pages;
create policy "Only admins can delete help pages" on public.help_pages
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin')
    )
  );

-- auto-generated seed for help_pages
insert into public.help_pages (slug, title, category, summary, sections, sort_order, show_in_footer, footer_group, is_published)
values
  ('baslangic', 'Başlangıç', 'Genel', 'Sisteme giriş, kullanıcı rolleri ve ana menünün kısa tanıtımı.', '[{"title":"Giriş yapma","paragraphs":["Tarayıcınızdan panele gidin ve e-posta veya kullanıcı adınız ile şifrenizi girin.","İlk girişten sonra mobil cihazlarda uygulamayı ana ekrana eklemeniz ve bildirim izni vermeniz önerilir (Ayarlar ve PWA rehberine bakın)."]},{"title":"Kullanıcı rolleri","paragraphs":["Admin: Tüm acenteleri, kullanıcıları, turları, maliyetleri ve sistem ayarlarını yönetir.","Acente yöneticisi / satış: Kendi acentesine ait biletleri keser, turları ve kataloğu görür, destek talebi açar.","Her rol menüde yalnızca yetkili olduğu sayfaları görür; eksik menü görüyorsanız yöneticinize başvurun."]},{"title":"Ana menü özeti","paragraphs":["Dashboard: Günlük özet ve hızlı erişim.","Biletler / Yeni Bilet: Rezervasyon oluşturma ve listeleme.","Turlar ve Tur Kataloğu: Tur tanımları ve müşteriye gönderilebilir fiyatlı katalog.","Duyurular: Şirket içi kayan yazı ve push bildirimleri.","Destek Talepleri: Teknik veya operasyonel yardım isteği.","Ayarlar: Profil, bildirimler, logo ve admin WhatsApp numarası (admin)."]}]'::jsonb, 10, true, 'featured', true),
  ('bilet-islemleri', 'Bilet kesme ve düzenleme', 'Biletler', 'Yeni bilet, düzenleme, iptal, PDF/JPEG oluşturma ve otomatik WhatsApp gönderimi.', '[{"title":"Yeni bilet kesme","paragraphs":["Menüden Yeni Bilet''e girin. Tur, tarih, misafir bilgileri, otel, kişi sayısı ve fiyat alanlarını doldurun.","Telefon numarasını ülke kodu ile doğru girin; WhatsApp gönderimi bu numaraya yapılır.","Kaydettikten sonra bilet detay sayfasına yönlendirilirsiniz; PDF ve WhatsApp işlemleri burada otomatik başlar."],"tips":["Yeni bilet URL''sinde ?new=1 parametresi varsa otomatik PDF üretimi ve WhatsApp tetiklenir."]},{"title":"Otomatik PDF ve WhatsApp","paragraphs":["Bilet kaydedildikten sonra sistem bilet görselini (JPEG) ve PDF''i oluşturur, depolamaya yükler.","Ardından müşteriye, acenteye ve admine (ayarlardaki numara + EasyBook dahili numara) ayrı mesaj metinleriyle bildirim gider.","Mesajda PDF linki ve mümkünse bilet görseli bulunur. Gönderim durumunu bilet sayfasındaki banner''dan takip edin."],"tips":["WhatsApp 24 saat kuralı: Müşteri daha önce sizinle yazışmadıysa şablon mesajı kullanılır; link her zaman metinde yer alır."]},{"title":"Bilet düzenleme","paragraphs":["Bilet listesinden veya detaydan Düzenle''ye tıklayın. Değişiklikleri kaydedince revize akışı çalışır (?revised=1).","Güncel PDF yeniden üretilir ve ilgili taraflara revize bildirimi gider."]},{"title":"İptal ve silme","paragraphs":["Acente kullanıcıları bileti iptal edebilir (pasif durum); silme yetkisi yoktur.","Admin bileti kalıcı olarak silebilir veya iptalden tekrar aktif edebilir."],"adminOnly":true},{"title":"Manuel PDF indirme","paragraphs":["Bilet detayında TR veya EN PDF butonları ile önizleme dilini seçip PDF indirebilirsiniz.","Otomatik gönderim başarısız olursa PDF linkini kopyalayıp WhatsApp''tan manuel paylaşabilirsiniz."]}]'::jsonb, 20, true, 'featured', true),
  ('turlar', 'Tur yönetimi', 'Turlar', 'Tur ekleme, çok dilli içerik, kalkış bilgileri ve katalog arkaplan görseli.', '[{"title":"Tur listesi","paragraphs":["Turlar menüsünden aktif ve pasif turları görürsünüz. Acenteler yalnızca aktif turları görür.","Tur Kataloğu kısayolu ile fiyatlı PDF kataloğa geçebilirsiniz."]},{"title":"Yeni tur ve düzenleme (Admin)","paragraphs":["Admin yeni tur ekler: ad, süre, açıklama, görseller, alış noktaları ve çeviriler (TR, EN, RU, PL).","Çeviri sekmelerinde tur adı, açıklama, program maddeleri, dahil / dahil olmayan listeleri ve detaylar girilir.","Kalkış günleri (haftanın günleri), kalkış saati ve buluşma noktası PDF katalogda kullanılır.","Katalog A4 arkaplanı: İsteğe bağlı dikey görsel; PDF''te sayfa başına 2 tur varken üstteki turun arkaplanı kullanılır."],"adminOnly":true},{"title":"Tek tur PDF","paragraphs":["Tur kartından veya tur detayından müşteriye gönderilebilir tek tur PDF''i (TR/EN) indirilebilir."]}]'::jsonb, 25, false, null, true),
  ('tur-katalogu', 'Tur kataloğu', 'Turlar', 'Tüm turlar için EUR satış fiyatları, çok dilli PDF ve müşteriye WhatsApp.', '[{"title":"Fiyat matrisi","paragraphs":["Tur Kataloğu sayfasında her tur için Yetişkin EUR ve Çocuk EUR sütunlarını doldurun.","Admin acente seçerek o acentenin fiyatlarını düzenler; acente yalnızca kendi fiyatlarını görür.","Kaydetmeden PDF indirme veya WhatsApp gönderimi yapılamaz; kaydedilmemiş satırlar uyarı verir."]},{"title":"PDF indirme","paragraphs":["Türkçe, İngilizce veya Rusça PDF butonları ile güncel kayıtlı fiyatlarla katalog indirilir.","PDF''te turlar kompakt kartlar halinde; fotoğraf solda, bilgi ve fiyat sağda listelenir."]},{"title":"Müşteriye WhatsApp","paragraphs":["Müşteri telefonu ve mesaj dilini seçin; Kataloğu WhatsApp ile Gönder''e basın.","Sistem PDF''i sunucuda üretir, depolar ve seçilen dilde mesaj + link gönderir."]},{"title":"Önizleme","paragraphs":["Sayfanın altındaki kart önizlemesi seçilen dile göre tur adı ve fiyatları gösterir; PDF ile tutarlı kontrol için kullanın."]}]'::jsonb, 30, true, 'featured', true),
  ('whatsapp', 'WhatsApp bildirimleri', 'İletişim', 'Bilet ve katalog mesajları, alıcılar ve sık karşılaşılan durumlar.', '[{"title":"Bilet sonrası otomatik mesajlar","paragraphs":["Müşteri: Türkçe veya İngilizce (telefon ülke koduna göre); mesajda bilet özeti ve PDF/görsel linki.","Acente: Acente perspektifinden özet + link.","Admin: Operasyonel detay (otel, alış, PAX, müşteri wa.me linki) + link.","EasyBook dahili numarası her yeni bilette bilgilendirilir; ayarlardaki admin numarası farklıysa o da eklenir."]},{"title":"Görsel ve PDF","paragraphs":["Öncelik JPEG bilet görseli ek dosya olarak gider; başarısız olursa yalnızca metin + link gönderilir.","PDF linki her zaman mesaj gövdesinde tıklanabilir şekilde yer alır."]},{"title":"24 saat penceresi","paragraphs":["WhatsApp Business, son 24 saatte yazışılmamış numaralara serbest medya kısıtı uygulayabilir.","Bu durumda onaylı şablon mesajı devreye girer; link yine mesajda bulunur."]},{"title":"WhatsApp logları (Admin)","paragraphs":["Menüden WhatsApp Logları ile giden mesajların durumunu (queued, delivered, failed) inceleyebilirsiniz."],"adminOnly":true}]'::jsonb, 40, true, 'featured', true),
  ('duyurular', 'Duyurular ve bildirimler', 'İletişim', 'Admin duyuruları, dashboard kayan yazı ve push bildirimleri.', '[{"title":"Duyuru yayınlama (Admin)","paragraphs":["Ayarlar bölümündeki Duyurular panelinden başlık, mesaj, hedef kitle (tümü / acente / admin) ve süre girilir.","İsteğe bağlı push bildirimi gönderilir; süre dolunca duyuru dashboard kayan yazısından kalkar."],"adminOnly":true},{"title":"Dashboard kayan yazı","paragraphs":["Aktif duyurular giriş yapmış kullanıcıların dashboard üstünde kayan bant olarak görünür."]},{"title":"Push bildirimleri","paragraphs":["Kullanıcılar Ayarlar''dan bildirim izni verir ve aboneliği yeniler.","PWA olarak yüklenmiş cihazlarda bildirimler uygulama kapalıyken de gelebilir."]}]'::jsonb, 50, true, 'quick', true),
  ('destek', 'Destek talepleri', 'Destek', 'Acentelerin talep açması ve admin yanıtı.', '[{"title":"Talep oluşturma","paragraphs":["Destek Talepleri menüsünden konu ve açıklama yazarak yeni talep açın.","Talep durumu açık / yanıtlandı / kapalı olarak takip edilir."]},{"title":"Admin yanıtı","paragraphs":["Admin tüm talepleri görür, yanıt yazar ve durumu günceller."],"adminOnly":true}]'::jsonb, 60, true, 'quick', true),
  ('pwa', 'Uygulama yükleme ve bildirimler', 'Mobil', 'Telefona PWA ekleme ve push bildirim izni.', '[{"title":"Uygulamayı yükleme","paragraphs":["Android/Chrome: Giriş sonrası çıkan banner veya Ayarlar''daki Uygulamayı Yükle.","iOS/Safari: Paylaş → Ana Ekrana Ekle (manuel adımlar ekranda gösterilir)."]},{"title":"Bildirim izni","paragraphs":["Bildirimleri Aç uyarısını onaylayın; reddettiyseniz tarayıcı ayarlarından site için bildirime izin verin.","Ayarlar''da Aboneliği Yenile ile push kaydı güncellenir."]}]'::jsonb, 70, true, 'quick', true),
  ('itur-fiyat', 'iTur Fiyat ve maliyetler', 'Fiyatlandırma', 'Admin taban maliyetleri ve acente satış fiyatları.', '[{"title":"Tur Maliyetleri (Admin)","paragraphs":["Admin Tur Maliyetleri sayfasında her tur için taban yetişkin/çocuk EUR ve TRY maliyetlerini girer.","Bu değerler acente fiyat ekranlarında varsayılan olarak referans alınabilir."],"adminOnly":true},{"title":"Acente iTur Fiyat","paragraphs":["Acente menüsünde iTur Fiyat ile kendi satış maliyet/fiyat tablosunu görür ve düzenler (yetkiye göre).","Tur Kataloğu''ndaki EUR satış fiyatları ayrı kaydedilir (agency_tour_prices); katalog PDF bu fiyatları kullanır."]},{"title":"PDF ve WhatsApp (maliyet raporu)","paragraphs":["Tur Maliyetleri sayfasından tüm maliyetleri PDF indirebilir veya acente telefonuna WhatsApp ile gönderebilirsiniz."]}]'::jsonb, 75, false, null, true),
  ('raporlar', 'Raporlar', 'Raporlama', 'Satış ve performans özet ekranı.', '[{"title":"Raporlar menüsü","paragraphs":["Raporlar sayfasından tarih ve filtrelerle bilet/satış özetlerini inceleyebilirsiniz.","Admin tüm acenteleri; acente kullanıcıları yalnızca kendi verilerini görür."]}]'::jsonb, 80, false, null, true),
  ('admin-panel', 'Admin işlemleri', 'Admin', 'Acenteler, kullanıcılar, filo, operasyon, ayarlar ve loglar.', '[{"title":"Acenteler","paragraphs":["Yeni acente oluşturma, kod, iletişim bilgileri ve aktif/pasif durumu."],"adminOnly":true},{"title":"Kullanıcılar","paragraphs":["Kullanıcı davet etme, rol atama (admin, acente yöneticisi, satış) ve acente bağlama."],"adminOnly":true},{"title":"Filo ve operasyon","paragraphs":["Filo Yönetimi: Tekne/araç kayıtları.","Operasyon Takvimi: Günlük operasyon planı.","Tekne Kiralamaları: Kiralama rezervasyonları."],"adminOnly":true},{"title":"Sistem ayarları","paragraphs":["Ayarlar: Site logosu, admin WhatsApp numarası, döviz kurları, duyuru yönetimi, push test.","Cloudflare ortam değişkenlerinde Twilio ve VAPID anahtarları tanımlı olmalıdır (teknik ekip)."],"adminOnly":true}]'::jsonb, 90, true, 'quick', true)
on conflict (slug) do nothing;
