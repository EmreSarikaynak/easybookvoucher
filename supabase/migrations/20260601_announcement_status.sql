-- Duyurulara taslak/yayında durumu + son gönderim zaman damgaları.
-- Mevcut kayıtlar geriye dönük 'published' kabul edilir.

alter table public.announcements
  add column if not exists status text not null default 'published'
    check (status in ('draft', 'published')),
  add column if not exists last_sent_at timestamptz null;

create index if not exists announcements_status_idx
  on public.announcements (status);

-- Mevcut satırları (default 'published' zaten olduğu için no-op ama net olsun)
update public.announcements set status = 'published' where status is null;

-- Admin update yetkisi (mevcut policy yok — düzenleme/yayınlama için gerekli)
drop policy if exists "Only admins can update announcements" on public.announcements;
create policy "Only admins can update announcements" on public.announcements
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

-- Aktif duyuru select policy'sini status='published' ile sıkılaştır
drop policy if exists "Users can view active announcements" on public.announcements;
create policy "Users can view active announcements" on public.announcements
  for select
  to authenticated
  using (expires_at > now() and status = 'published');
