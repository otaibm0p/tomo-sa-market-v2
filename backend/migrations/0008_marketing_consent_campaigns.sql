-- Marketing consent (customer-safe, default OFF) and WhatsApp contact fields on users
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_opt_in BOOLEAN DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS marketing_opt_in_at TIMESTAMP NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS channel_opt_in JSONB DEFAULT '{}';
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_channel TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS tags JSONB DEFAULT '[]';
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_phone TEXT NULL;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp_verified BOOLEAN DEFAULT false;

-- Campaign tables (UUIDs via gen_random_uuid())
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name_ar VARCHAR(200),
  name_en VARCHAR(200),
  channel VARCHAR(20) NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email', 'push')),
  template_key VARCHAR(120),
  status VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'paused')),
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  audience_filters JSONB DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS marketing_campaign_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  run_status VARCHAR(20) NOT NULL DEFAULT 'queued' CHECK (run_status IN ('queued', 'dry_run', 'sent', 'failed')),
  total_targeted INTEGER DEFAULT 0,
  total_sent INTEGER DEFAULT 0,
  total_failed INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS marketing_message_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_run_id UUID NOT NULL REFERENCES marketing_campaign_runs(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  channel VARCHAR(20) NOT NULL,
  to_phone TEXT,
  template_key VARCHAR(120),
  provider_message_id TEXT,
  status VARCHAR(30) DEFAULT 'pending',
  error TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_marketing_campaigns_status ON marketing_campaigns(status);
CREATE INDEX IF NOT EXISTS idx_marketing_campaign_runs_campaign ON marketing_campaign_runs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_marketing_message_log_run ON marketing_message_log(campaign_run_id);
