-- Public katalog + QR + otomatik rezervasyon altyapısı
-- Müşteri QR tarayınca /c/<agency_code> sayfasına düşer, oradan rezervasyon yapar.
-- Rezervasyon = otomatik voucher (source='public_qr').

-- 1) vouchers tablosuna source kolonu (rezervasyonun nereden geldiğini izlemek için)
alter table public.vouchers
  add column if not exists source text not null default 'manual'
    check (source in ('manual', 'public_qr', 'admin'));

-- Public katalogtan gelen rezervasyonlar için opsiyonel email
alter table public.vouchers
  add column if not exists customer_email text null;

-- Mevcut kayıtların source'u 'manual' olarak kalır (default değer atanmadan önce eklenenler için)
update public.vouchers set source = 'manual' where source is null;

-- 2) agencies tablosuna public_catalog_enabled flag
-- Acente kendi public katalogunu kapatmak istiyorsa false yapar.
alter table public.agencies
  add column if not exists public_catalog_enabled boolean not null default true;

-- 3) Public okuma için agencies tablosuna anonim okuma policy'si
--    YALNIZCA: agency_code, public_catalog_enabled, is_active alanları okunur
--    name, phone, email gibi PII olan alanlar SERVER tarafında filter edilir (acente adı gizleme politikası)
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'agencies'
      and policyname = 'public_can_read_active_agency_codes'
  ) then
    create policy public_can_read_active_agency_codes
      on public.agencies
      for select
      to anon, authenticated
      using (is_active = true and public_catalog_enabled = true);
  end if;
end $$;

-- 4) tours için public okuma policy (mevcut sadece authenticated için olabilir)
--    Sadece is_active=true turlar görünür.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'tours'
      and policyname = 'public_can_read_active_tours'
  ) then
    create policy public_can_read_active_tours
      on public.tours
      for select
      to anon, authenticated
      using (is_active = true);
  end if;
end $$;

-- 5) agency_tour_prices için public okuma (acentenin satış fiyatlarını gösterirken gerekiyor)
--    Sadece o acentenin ve aktif turun fiyatlarını verir.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'agency_tour_prices'
      and policyname = 'public_can_read_agency_tour_prices'
  ) then
    create policy public_can_read_agency_tour_prices
      on public.agency_tour_prices
      for select
      to anon, authenticated
      using (true);
  end if;
end $$;

-- 6) Index: source bazlı raporlama hızlansın
create index if not exists vouchers_source_idx on public.vouchers (source);
create index if not exists vouchers_agency_id_tour_date_idx on public.vouchers (agency_id, tour_date);
