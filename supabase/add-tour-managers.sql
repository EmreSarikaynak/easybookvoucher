-- Bu komutu Supabase SQL Editor'de çalıştırarak tours tablosuna yeni alanı ekleyin.
ALTER TABLE tours ADD COLUMN tour_managers JSONB DEFAULT '[]'::jsonb;
