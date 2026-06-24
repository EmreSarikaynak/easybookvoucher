-- Duyuru yayinlandiginda WhatsApp ile de bildirim gonder opsiyonu
-- Default true: yeni duyurular varsayilan olarak WhatsApp gonderir
-- (UI'da uncheck edilebilir).

alter table public.announcements
  add column if not exists send_whatsapp boolean not null default true;

comment on column public.announcements.send_whatsapp is
  'true ise duyuru olusturulurken sendAnnouncementWhatsApp() ile hedef role gore numaralara serbest metin gonderilir. 24h kurali geregi bazi alicilara ulasmayabilir; whatsapp_logs tablosundan durum izlenir.';
