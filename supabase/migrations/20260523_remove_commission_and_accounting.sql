-- Komisyon & muhasebe sistemini tamamen kaldır
-- Trigger ve fonksiyon
DROP TRIGGER IF EXISTS trg_set_agent_owes ON vouchers;
DROP FUNCTION IF EXISTS set_agent_owes_on_voucher() CASCADE;

-- agent_payments tablosu
DROP TABLE IF EXISTS agent_payments CASCADE;

-- vouchers kolonları
ALTER TABLE vouchers DROP COLUMN IF EXISTS agent_owes_easybook_eur;
ALTER TABLE vouchers DROP COLUMN IF EXISTS agency_payment_status;
ALTER TABLE vouchers DROP COLUMN IF EXISTS agency_payment_date;

-- agencies kolonu
ALTER TABLE agencies DROP COLUMN IF EXISTS commission_rate;
