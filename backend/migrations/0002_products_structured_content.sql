-- Add structured product content fields (AR/EN) for professional product page

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS short_description_ar TEXT,
  ADD COLUMN IF NOT EXISTS short_description_en TEXT,
  ADD COLUMN IF NOT EXISTS full_description_ar TEXT,
  ADD COLUMN IF NOT EXISTS full_description_en TEXT,
  ADD COLUMN IF NOT EXISTS ingredients_ar TEXT,
  ADD COLUMN IF NOT EXISTS ingredients_en TEXT,
  ADD COLUMN IF NOT EXISTS nutrition_facts_ar TEXT,
  ADD COLUMN IF NOT EXISTS nutrition_facts_en TEXT,
  ADD COLUMN IF NOT EXISTS allergens_ar TEXT,
  ADD COLUMN IF NOT EXISTS allergens_en TEXT,
  ADD COLUMN IF NOT EXISTS storage_instructions_ar TEXT,
  ADD COLUMN IF NOT EXISTS storage_instructions_en TEXT,
  ADD COLUMN IF NOT EXISTS origin_country VARCHAR(120),
  ADD COLUMN IF NOT EXISTS brand VARCHAR(120);

CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_brand ON products(brand);


