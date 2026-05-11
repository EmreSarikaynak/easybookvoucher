-- Add tour_url column to tours table
ALTER TABLE tours ADD COLUMN IF NOT EXISTS tour_url TEXT;

-- Comment for clarity
COMMENT ON COLUMN tours.tour_url IS 'URL for tour details page - used for QR code on voucher tickets';
