-- Index for webhook lookups by provider_message_id
CREATE INDEX IF NOT EXISTS idx_marketing_message_log_provider_message_id
  ON marketing_message_log(provider_message_id) WHERE provider_message_id IS NOT NULL;
