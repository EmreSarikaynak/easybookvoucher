-- Migration: per-tour infant (bebek) pricing
--
-- Adds:
--   tours.infant_pricing_enabled  — per-tour toggle ("Bebek" butonu). FALSE iken
--     hiçbir ekranda bebek fiyatı görünmez (geriye uyumlu).
--   tours.base_price_infant_{eur,try} — EasyBook taban bebek maliyeti.
--   agency_tour_prices.price_infant — acente bebek satış fiyatı (NULL = girilmemiş).
--   agency_tour_prices.cost_infant  — per-agency override bebek maliyeti.
--
-- Safe to re-run: all ADDs use IF NOT EXISTS.
-- Rollback script at bottom (commented out — do not run unless reverting).

BEGIN;

ALTER TABLE public.tours
  ADD COLUMN IF NOT EXISTS infant_pricing_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS base_price_infant_eur numeric(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS base_price_infant_try numeric(10,2) DEFAULT 0;

ALTER TABLE public.agency_tour_prices
  ADD COLUMN IF NOT EXISTS price_infant numeric(10,2),
  ADD COLUMN IF NOT EXISTS cost_infant  numeric(10,2);

COMMENT ON COLUMN public.tours.infant_pricing_enabled IS
  'TRUE ise bu tur için bebek (infant) fiyatı ayrıca girilebilir ve katalogda gösterilir.';
COMMENT ON COLUMN public.tours.base_price_infant_eur IS 'EasyBook taban bebek maliyeti (EUR).';
COMMENT ON COLUMN public.tours.base_price_infant_try IS 'EasyBook taban bebek maliyeti (TRY).';
COMMENT ON COLUMN public.agency_tour_prices.price_infant IS 'Acente bebek satış fiyatı. NULL = girilmemiş.';
COMMENT ON COLUMN public.agency_tour_prices.cost_infant  IS 'Per-agency override bebek maliyeti. NULL = use tours.base_price_infant_*';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (do not run unless reverting):
--
-- BEGIN;
-- ALTER TABLE public.agency_tour_prices
--   DROP COLUMN IF EXISTS cost_infant,
--   DROP COLUMN IF EXISTS price_infant;
-- ALTER TABLE public.tours
--   DROP COLUMN IF EXISTS base_price_infant_try,
--   DROP COLUMN IF EXISTS base_price_infant_eur,
--   DROP COLUMN IF EXISTS infant_pricing_enabled;
-- COMMIT;
