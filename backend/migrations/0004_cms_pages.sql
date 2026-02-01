-- Simple CMS pages (About/Privacy/Terms etc.)

CREATE TABLE IF NOT EXISTS cms_pages (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(120) UNIQUE NOT NULL,
  title_ar VARCHAR(200) NOT NULL,
  title_en VARCHAR(200) NOT NULL,
  content_ar TEXT NOT NULL DEFAULT '',
  content_en TEXT NOT NULL DEFAULT '',
  is_published BOOLEAN NOT NULL DEFAULT true,
  show_in_footer BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cms_pages_published ON cms_pages(is_published);
CREATE INDEX IF NOT EXISTS idx_cms_pages_footer ON cms_pages(show_in_footer, sort_order);


