-- =============================================================
-- Exchange Rates Historical Tracking Migration
-- =============================================================
-- This migration adds date-based tracking to exchange rates table
-- to prevent calculation errors when rates change over time.

-- Step 1: Add effective_date column with default value
ALTER TABLE exchange_rates 
ADD COLUMN IF NOT EXISTS effective_date DATE NOT NULL DEFAULT CURRENT_DATE;

-- Step 2: Create index on effective_date for performance
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date 
ON exchange_rates (from_currency, to_currency, effective_date DESC);

-- Step 3: Drop old unique constraint if exists
ALTER TABLE exchange_rates 
DROP CONSTRAINT IF EXISTS exchange_rates_from_currency_to_currency_key;

-- Step 4: Add new unique constraint with date
ALTER TABLE exchange_rates 
ADD CONSTRAINT exchange_rates_from_to_date_unique 
UNIQUE (from_currency, to_currency, effective_date);

-- Step 5: Add comment to table
COMMENT ON COLUMN exchange_rates.effective_date IS 'The date when this exchange rate becomes effective. Allows historical rate tracking.';

-- Step 6: Create helper function to get exchange rate for a specific date
-- If no rate exists for the exact date, returns the most recent rate before that date
CREATE OR REPLACE FUNCTION get_exchange_rate_for_date(
  p_from_currency currency_type,
  p_to_currency currency_type,
  p_date DATE DEFAULT CURRENT_DATE
) RETURNS NUMERIC AS $$
DECLARE
  v_rate NUMERIC;
BEGIN
  SELECT rate INTO v_rate
  FROM exchange_rates
  WHERE from_currency = p_from_currency
    AND to_currency = p_to_currency
    AND effective_date <= p_date
  ORDER BY effective_date DESC
  LIMIT 1;
  
  RETURN COALESCE(v_rate, 1.0);
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_exchange_rate_for_date IS 'Returns the exchange rate for a given date. If no exact match, returns the most recent rate before that date.';
