-- WhatsApp Logs Table
CREATE TABLE IF NOT EXISTS public.whatsapp_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    message_sid VARCHAR(255) NOT NULL,
    voucher_no VARCHAR(100),
    phone_number VARCHAR(50) NOT NULL,
    direction VARCHAR(20) NOT NULL CHECK (direction IN ('outbound', 'inbound')),
    body TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'queued',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS (Row Level Security)
ALTER TABLE public.whatsapp_logs ENABLE ROW LEVEL SECURITY;

-- Sadece super_admin ve admin görebilir
CREATE POLICY "Adminler tüm whatsapp loglarını görebilir"
ON public.whatsapp_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('super_admin', 'admin')
  )
);

-- Sadece auth kullanıcılar veya service_role insert/update yapabilir (Webhooklar için genelde service_role kullanılır)
CREATE POLICY "Servis veya auth olanlar log ekleyebilir"
ON public.whatsapp_logs
FOR INSERT
WITH CHECK (true); -- Tüm girişlere izin ver (Webhooklar public olabilir, güvenlik kodu API tarafında kontrol edilir)

CREATE POLICY "Servis veya auth olanlar log güncelleyebilir"
ON public.whatsapp_logs
FOR UPDATE
USING (true);

-- Index for faster queries
CREATE INDEX idx_whatsapp_logs_message_sid ON public.whatsapp_logs(message_sid);
CREATE INDEX idx_whatsapp_logs_created_at ON public.whatsapp_logs(created_at DESC);
