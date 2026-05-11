-- =============================================================
-- Global Settings Table & Storage
-- =============================================================

-- 1. Create 'settings' table
CREATE TABLE IF NOT EXISTS settings (
  key         TEXT PRIMARY KEY,
  value       JSONB NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Turn on RLS
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policies for settings table
-- Everyone (even specific public pages if needed later) can READ settings like 'site_logo'
-- But for now let's restrict to authenticated or public depending on need.
-- Actually, login page is public, so we need public read access for specific keys.
CREATE POLICY "settings_select_public" ON settings FOR SELECT
  USING (TRUE); -- Everyone can read settings (safe for now, as we only put logo there)

CREATE POLICY "settings_insert_admin" ON settings FOR INSERT
  WITH CHECK (auth_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "settings_update_admin" ON settings FOR UPDATE
  USING (auth_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "settings_delete_admin" ON settings FOR DELETE
  USING (auth_user_role() IN ('super_admin', 'admin'));


-- 2. Create 'public-assets' bucket for logo (publicly accessible)
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-assets', 'public-assets', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for 'public-assets'
-- Everyone can read
CREATE POLICY "public_assets_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'public-assets');

-- Only admins can insert/update/delete
CREATE POLICY "public_assets_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'public-assets' AND auth_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "public_assets_update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'public-assets' AND auth_user_role() IN ('super_admin', 'admin'));

CREATE POLICY "public_assets_delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'public-assets' AND auth_user_role() IN ('super_admin', 'admin'));

-- Trigger for updated_at
CREATE TRIGGER trg_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
