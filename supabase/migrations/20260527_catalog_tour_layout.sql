-- Tur kataloğu — admin tarafından belirlenen sayfa-slot bazlı tur yerleşimi.
-- page_number: tur sayfası indeksi (1 = ilk tur sayfası; PDF'te bu, kapak ve içindekiler
-- sonrası sayfa 3'e denk gelir). slot: 0 (üst) veya 1 (alt). Her sayfada 2 slot vardır.

create table if not exists public.catalog_tour_layout (
  tour_id uuid primary key references public.tours(id) on delete cascade,
  page_number int not null check (page_number >= 1),
  slot int not null check (slot in (0, 1)),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  unique (page_number, slot)
);

create or replace function public.set_catalog_tour_layout_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists catalog_tour_layout_updated_at on public.catalog_tour_layout;
create trigger catalog_tour_layout_updated_at
  before update on public.catalog_tour_layout
  for each row execute function public.set_catalog_tour_layout_updated_at();

alter table public.catalog_tour_layout enable row level security;

drop policy if exists "Read catalog tour layout (authenticated)" on public.catalog_tour_layout;
create policy "Read catalog tour layout (authenticated)" on public.catalog_tour_layout
  for select
  to authenticated
  using (true);

drop policy if exists "Admins manage catalog tour layout (insert)" on public.catalog_tour_layout;
create policy "Admins manage catalog tour layout (insert)" on public.catalog_tour_layout
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('super_admin', 'admin')
    )
  );

drop policy if exists "Admins manage catalog tour layout (update)" on public.catalog_tour_layout;
create policy "Admins manage catalog tour layout (update)" on public.catalog_tour_layout
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

drop policy if exists "Admins manage catalog tour layout (delete)" on public.catalog_tour_layout;
create policy "Admins manage catalog tour layout (delete)" on public.catalog_tour_layout
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
        and profiles.role in ('super_admin', 'admin')
    )
  );
