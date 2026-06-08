-- Migration: price_per_booking flag for tours
--
-- Bazı turlar (ör. ATV Double Safari) araç/rezervasyon başına fiyatlandırılır;
-- kişi sayısından bağımsız olarak 1× fiyat uygulanır.
-- Bu flag true olan turlarda toplam fiyat = 1 × fiyat (pax ile çarpılmaz).

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS price_per_booking BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.tours.price_per_booking IS
  'TRUE ise fiyat kişi başı değil rezervasyon/araç başıdır (ör. ATV Double). Voucher formunda pax sayısı ne olursa olsun toplam = 1 × fiyat.';
