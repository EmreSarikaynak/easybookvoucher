-- Support Tickets tablosu
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID REFERENCES agencies(id) ON DELETE SET NULL,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  admin_reply TEXT,
  replied_at TIMESTAMPTZ,
  replied_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- Index
CREATE INDEX IF NOT EXISTS support_tickets_user_id_idx ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS support_tickets_agency_id_idx ON support_tickets(agency_id);
CREATE INDEX IF NOT EXISTS support_tickets_status_idx ON support_tickets(status);

-- updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_support_tickets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_support_tickets_updated_at();

-- RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

-- Admin / super_admin: her şeyi görebilir ve düzenleyebilir
CREATE POLICY "Admin tüm destek taleplerini yönetebilir"
  ON support_tickets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('super_admin', 'admin')
    )
  );

-- Kullanıcı kendi taleplerini görebilir
CREATE POLICY "Kullanıcı kendi taleplerini görebilir"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Kullanıcı kendi taleplerini oluşturabilir
CREATE POLICY "Kullanıcı talep oluşturabilir"
  ON support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Kullanıcı kendi açık/işlemdeki taleplerini kapatabilir (status güncelleyebilir)
CREATE POLICY "Kullanıcı kendi taleplerini güncelleyebilir"
  ON support_tickets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
