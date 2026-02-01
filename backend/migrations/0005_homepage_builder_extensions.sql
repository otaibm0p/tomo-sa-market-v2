-- Homepage builder extensions (section types + view-all config)

ALTER TABLE homepage_sections
  ADD COLUMN IF NOT EXISTS section_type VARCHAR(50) DEFAULT 'products',
  ADD COLUMN IF NOT EXISTS data_source VARCHAR(50) DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS filters_json JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS show_view_all BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS view_all_slug VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_homepage_sections_enabled_priority ON homepage_sections(enabled, sort_priority);


