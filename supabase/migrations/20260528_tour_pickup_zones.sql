-- Tur alış bölgeleri (pickup zones)
--
-- Rafting gibi çoğu noktadan transfer yapan turlar için bölgeye göre farklı
-- kalkış saati ve buluşma noktası bilgisini taşır. Yapı:
--   [{ "region": "Bodrum Merkez", "time": "06:10", "meeting_point": "Otel Önü" }]
-- pickup_locations (mevcut basit string array) bölge/saat içermediği için
-- bu alan, voucher/katalog görüntülemelerinde tablo şeklinde render edilmek üzere
-- ayrı tutulur. Eski turlarda NULL kalır; UI bu durumda eski 'meeting_point'
-- ve 'departure_time' alanlarını gösterir.

alter table public.tours
  add column if not exists pickup_zones jsonb;

comment on column public.tours.pickup_zones is
  'Bolgeye gore alis tablosu: [{region, time, meeting_point}]';

-- Rafting turu (ad ilike "%rafting%") için örnek tabloyu yalnızca alan henüz
-- doldurulmamışsa ekle. Bu sayede migration tekrar çalışsa veya admin elle
-- düzenlese üzerine yazılmaz.
update public.tours
set pickup_zones = '[
  {"region":"Bodrum Merkez","time":"06:10","meeting_point":"Otel Önü"},
  {"region":"Gümbet","time":"06:00","meeting_point":"Otel Önü"},
  {"region":"Bitez","time":"05:45","meeting_point":"Otel Önü"},
  {"region":"Akyarlar","time":"05:15","meeting_point":"Otel Önü"},
  {"region":"T.Reis","time":"05:30","meeting_point":"Otel Önü"},
  {"region":"Ortakent","time":"06:00","meeting_point":"Otel Önü"},
  {"region":"Yalı Kavak","time":"05:30","meeting_point":"Torba Kavşak Köprü Altı"},
  {"region":"Kadıkale","time":"05:30","meeting_point":"Torba Kavşak Köprü Altı"},
  {"region":"Gündoğan","time":"06:00","meeting_point":"Torba Kavşak Köprü Altı"},
  {"region":"Türkbükü","time":"05:30","meeting_point":"Torba Kavşak Köprü Altı"},
  {"region":"Kaynarlar","time":"06:30","meeting_point":"Torba Kavşak Köprü Altı"},
  {"region":"Güvercinlik","time":"07:00","meeting_point":"Torba Kavşak Köprü Altı"}
]'::jsonb
where name ilike '%rafting%'
  and pickup_zones is null;
