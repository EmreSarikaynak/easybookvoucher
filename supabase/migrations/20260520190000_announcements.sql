-- Duyurular tablosu: Admin tarafından yayımlanan kayan yazı + push bildirimleri
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  target_role text null,
  expires_at timestamptz not null,
  send_push boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists announcements_active_idx
  on public.announcements (expires_at desc)
  where expires_at > now();

create index if not exists announcements_target_role_idx
  on public.announcements (target_role);

alter table public.announcements enable row level security;

-- Tüm giriş yapmış kullanıcılar aktif duyuruları görebilir
drop policy if exists "Users can view active announcements" on public.announcements;
create policy "Users can view active announcements" on public.announcements
  for select
  to authenticated
  using (expires_at > now());

-- Sadece admin yazabilir
drop policy if exists "Only admins can create announcements" on public.announcements;
create policy "Only admins can create announcements" on public.announcements
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin')
    )
  );

-- Sadece admin silebilir
drop policy if exists "Only admins can delete announcements" on public.announcements;
create policy "Only admins can delete announcements" on public.announcements
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where profiles.id = auth.uid()
      and profiles.role in ('super_admin', 'admin')
    )
  );
