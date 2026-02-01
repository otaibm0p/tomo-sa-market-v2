type AnyProduct = any

function num(v: any): number {
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN
  return Number.isFinite(n) ? n : NaN
}

function getProductName(p: AnyProduct): string {
  return String(p?.name_ar || p?.name_en || p?.name || '').trim()
}

function getProductBrand(p: AnyProduct): string {
  return String(p?.brand || p?.brand_name || p?.brandName || '').trim().toLowerCase()
}

function getProductCategoryId(p: AnyProduct): number | null {
  const cid = num(p?.category_id ?? p?.categoryId ?? p?.category?.id)
  return Number.isFinite(cid) ? cid : null
}

function getProductPrice(p: AnyProduct): number {
  // Prefer price_per_unit if present, fallback to price/discount fields.
  const candidates = [
    p?.price_per_unit,
    p?.pricePerUnit,
    p?.discount_price,
    p?.discountPrice,
    p?.price,
  ]
  for (const c of candidates) {
    const n = num(c)
    if (Number.isFinite(n) && n > 0) return n
  }
  return NaN
}

function getAvailableStock(p: AnyProduct): number | null {
  const candidates = [p?.available_quantity, p?.stock_quantity, p?.quantity, p?.countInStock]
  for (const c of candidates) {
    const n = num(c)
    if (Number.isFinite(n)) return n
  }
  return null
}

function parseSizeToken(name: string): string | null {
  const s = String(name || '').toLowerCase()
  // Match things like 1l, 500ml, 1 kg, 250 g
  const m = s.match(/(\d+(?:\.\d+)?)\s*(ml|l|g|kg)\b/i)
  if (!m) return null
  const val = m[1]
  const unit = m[2].toLowerCase()
  return `${val}${unit}`
}

function within15Pct(targetPrice: number, price: number) {
  if (!Number.isFinite(targetPrice) || targetPrice <= 0) return false
  if (!Number.isFinite(price) || price <= 0) return false
  const diff = Math.abs(price - targetPrice) / targetPrice
  return diff <= 0.15
}

export function suggestSmartSubstitutions(opts: {
  targetProduct: AnyProduct
  allProducts: AnyProduct[]
  limit?: number
}): AnyProduct[] {
  const limit = opts.limit ?? 3
  const target = opts.targetProduct
  const products = Array.isArray(opts.allProducts) ? opts.allProducts : []
  const targetId = num(target?.id)
  const targetPrice = getProductPrice(target)
  const targetCat = getProductCategoryId(target)
  const targetBrand = getProductBrand(target)
  const targetSize = parseSizeToken(getProductName(target))

  const base = products.filter((p) => {
    const pid = num(p?.id)
    if (Number.isFinite(targetId) && Number.isFinite(pid) && pid === targetId) return false
    return true
  })

  const catPool = targetCat != null ? base.filter((p) => getProductCategoryId(p) === targetCat) : base
  const pool = catPool.length ? catPool : base

  const pricePool = Number.isFinite(targetPrice) ? pool.filter((p) => within15Pct(targetPrice, getProductPrice(p))) : []
  const candidates = pricePool.length >= limit ? pricePool : pool

  const scored = candidates
    .map((p) => {
      const price = getProductPrice(p)
      const brand = getProductBrand(p)
      const size = parseSizeToken(getProductName(p))
      const stock = getAvailableStock(p)

      const sameCat = targetCat != null && getProductCategoryId(p) === targetCat
      const sameBrand = !!targetBrand && brand === targetBrand
      const sizeMatch = !!targetSize && !!size && size === targetSize

      let score = 0
      if (sameCat) score += 4
      if (sameBrand) score += 2
      if (sizeMatch) score += 2
      if (Number.isFinite(stock) && stock > 0) score += 1

      if (Number.isFinite(targetPrice) && Number.isFinite(price) && targetPrice > 0) {
        const diffRatio = Math.abs(price - targetPrice) / targetPrice
        const closeness = Math.max(0, 3 - (diffRatio / 0.15) * 3) // 0..3 within 15%
        score += closeness
      }

      const priceDiff = Number.isFinite(targetPrice) && Number.isFinite(price) ? Math.abs(price - targetPrice) : Number.POSITIVE_INFINITY
      return { p, score, priceDiff }
    })
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.priceDiff - b.priceDiff
    })

  const top = scored.slice(0, limit).map((x) => x.p)

  // If we were forced to use full pool and still got weird/empty results, fallback to closest by price.
  if (top.length < limit && Number.isFinite(targetPrice)) {
    const fallback = pool
      .map((p) => ({ p, d: Math.abs(getProductPrice(p) - targetPrice) }))
      .filter((x) => Number.isFinite(x.d))
      .sort((a, b) => a.d - b.d)
      .slice(0, limit)
      .map((x) => x.p)
    return fallback
  }

  return top
}

export function isLowStockOrUnavailable(p: AnyProduct, lowThreshold = 3): { out: boolean; low: boolean; qty: number | null } {
  const stock = getAvailableStock(p)
  if (stock == null) return { out: false, low: false, qty: null }
  const out = stock <= 0
  const low = stock > 0 && stock <= lowThreshold
  return { out, low, qty: stock }
}

