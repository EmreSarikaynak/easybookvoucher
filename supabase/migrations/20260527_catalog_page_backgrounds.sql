-- Tur kataloğu sayfa arkaplanları (global, admin-only)
-- Sayfa numarası: 1 = Kapak, 2 = İçindekiler, 3..N = Tur sayfaları (her sayfa 2 tur).
-- tours.catalog_background_url alanı kaldırıldı (tur başına arkaplan yanlış kurguydu).

create table if not exists public.catalog_page_backgrounds (
  page_number int primary key check (page_number >= 1),
  background_url text not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null
);

create or replace function public.set_catalog_page_backgrounds_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists catalog_page_backgrounds_updated_at on public.catalog_page_backgrounds;
create trigger catalog_page_backgrounds_updated_at
  before update on public.catalog_page_backgrounds
  for each row execute function public.set_catalog_page_backgrounds_updated_at();

alter table public.catalog_page_backgrounds enable row level security;

drop policy if exists "Read catalog backgrounds (authenticated)" on public.catalog_page_backgrounds;
create policy "Read catalog backgrounds (authenticated)" on public.catalog_page_backgrounds
  for select
  to authenticated
  using (true);

drop policy if exists "Admins manage catalog backgrounds (insert)" on public.catalog_page_backgrounds;
create policy "Admins manage catalog backgrounds (insert)" on public.catalog_page_backgrounds
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('super_admin', 'admin')
    )
  );

drop policy if exists "Admins manage catalog backgrounds (update)" on public.catalog_page_backgrounds;
create policy "Admins manage catalog backgrounds (update)" on public.catalog_page_backgrounds
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

drop policy if exists "Admins manage catalog backgrounds (delete)" on public.catalog_page_backgrounds;
create policy "Admins manage catalog backgrounds (delete)" on public.catalog_page_backgrounds
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('super_admin', 'admin')
    )
  );

alter table public.tours drop column if exists catalog_background_url;
