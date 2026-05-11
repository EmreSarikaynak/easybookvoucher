-- Migration: Per-agency, per-tour pricing with adult/child split + custom cost
--
-- Adds: price_adult, price_child, cost_adult, cost_child to agency_tour_prices.
-- Keeps existing `price` column intact (deprecated) for backward compatibility;
-- copies existing values into price_adult.
--
-- Safe to re-run: all ADDs use IF NOT EXISTS; UPDATE only fills NULL.
-- Rollback script at bottom (commented out — do not run unless reverting).

BEGIN;

-- 1) Add new nullable columns
ALTER TABLE public.agency_tour_prices
  ADD COLUMN IF NOT EXISTS price_adult numeric(10,2),
  ADD COLUMN IF NOT EXISTS price_child numeric(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cost_adult  numeric(10,2),
  ADD COLUMN IF NOT EXISTS cost_child  numeric(10,2);

-- 2) Backfill price_adult from legacy `price` for existing rows
UPDATE public.agency_tour_prices
SET price_adult = price
WHERE price_adult IS NULL AND price IS NOT NULL;

-- 3) Documentation
COMMENT ON COLUMN public.agency_tour_prices.price        IS 'DEPRECATED — use price_adult / price_child. Kept for backward compatibility.';
COMMENT ON COLUMN public.agency_tour_prices.price_adult  IS 'Sales price charged to the agency, adult';
COMMENT ON COLUMN public.agency_tour_prices.price_child  IS 'Sales price charged to the agency, child';
COMMENT ON COLUMN public.agency_tour_prices.cost_adult   IS 'Per-agency override cost (adult). NULL = use tours.base_price_adult_*';
COMMENT ON COLUMN public.agency_tour_prices.cost_child   IS 'Per-agency override cost (child). NULL = use tours.base_price_child_*';

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- ROLLBACK (do not run unless reverting):
--
-- BEGIN;
-- ALTER TABLE public.agency_tour_prices
--   DROP COLUMN IF EXISTS cost_child,
--   DROP COLUMN IF EXISTS cost_adult,
--   DROP COLUMN IF EXISTS price_child,
--   DROP COLUMN IF EXISTS price_adult;
-- COMMIT;
