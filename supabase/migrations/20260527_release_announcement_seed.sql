-- 27 Mayıs 2026 sürüm duyurusu (seed).
-- Idempotent: aynı başlıkla bir kez insert edilir, tekrar çalıştırılırsa yeniden eklenmez.
-- send_push/send_whatsapp false: migration SQL'i app server'ı tetiklemediği için
-- buradan bir push/WhatsApp gönderimi yapılmaz; yalnızca dashboard marquee'sinde
-- ve /announcements sayfasında görünür.

insert into public.announcements (
  title,
  message,
  target_role,
  expires_at,
  send_push,
  send_whatsapp,
  created_by
)
select
  '✨ Yeni: WhatsApp Duyuru, Sayfa Arkaplanı ve Bildirim Sesi',
  'Tur Kataloğu sayfa-arkaplanı yönetimi (admin), duyurular için isteğe bağlı WhatsApp gönderimi, push bildirimlerinde uzun titreşim ve in-app ses. Detaylar için bu mesaja tıklayın.',
  null,
  now() + interval '14 days',
  false,
  false,
  null
where not exists (
  select 1
  from public.announcements
  where title = '✨ Yeni: WhatsApp Duyuru, Sayfa Arkaplanı ve Bildirim Sesi'
);
