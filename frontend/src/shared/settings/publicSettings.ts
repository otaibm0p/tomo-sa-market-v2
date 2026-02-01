import api from '../../utils/api'

export type PublicSettings = {
  brandName?: string | null
  supportPhone?: string | null
  supportWhatsApp?: string | null
  supportEmail?: string | null
  supportHours?: string | null
  social?: {
    twitter?: string | null
    instagram?: string | null
  } | null
  paymentMethods?: string[] | null
  // Optional: if backend returns categories in settings
  categories?: Array<{ id?: number; name?: string; name_ar?: string; name_en?: string }> | null
  promoStrip?: {
    enabled: boolean
    textAr: string
    textEn: string
    icon: string
    linkUrl: string | null
    linkLabelAr: string | null
    linkLabelEn: string | null
    variant: 'neutral' | 'success' | 'promo' | 'warning'
    align: 'center' | 'right' | 'left'
    dismissible: boolean
    scope: 'all' | 'home'
    mobileOnly: boolean
    startAt: string | null
    endAt: string | null
  } | null
  homeHero?: {
    enabled: boolean
    height: 'sm' | 'md' | 'lg'
  } | null
  siteLinks?: {
    // New structure used by public Header/Footer
    headerLinks?: Array<{ key: string; label_ar: string; label_en: string; href: string; external: boolean }> | null
    footerColumns?: Array<{
      title_ar: string
      title_en: string
      links: Array<{ label_ar: string; label_en: string; href: string; external: boolean }>
    }> | null

    support: {
      whatsappNumber: string | null
      whatsappMessageAr: string | null
      whatsappMessageEn: string | null
    }
    header: {
      showSupportButton: boolean
      supportLabelAr: string
      supportLabelEn: string
    }
    footer: {
      columns: Array<{
        id: string
        titleAr: string
        titleEn: string
        links: Array<{
          id: string
          labelAr: string
          labelEn: string
          url: string
          external: boolean
        }>
      }>
      trustItems: Array<{ id: string; textAr: string; textEn: string; icon: string }>
    }
  } | null
  sitePages?: Array<{
    slug: string
    titleAr: string
    titleEn: string
    contentAr: string
    contentEn: string
    published: boolean
  }> | null
  siteSupport?: {
    whatsappNumber: string | null
    phone: string | null
    email: string | null
    hours_ar: string | null
    hours_en: string | null
  } | null
  trustFeatures?: Array<{
    icon: 'truck' | 'lock' | 'phone'
    color: string
    labelAr: string
    labelEn: string
    enabled: boolean
  }> | null

  // Dispatch / driver assignment mode (public)
  dispatchMode?: 'AUTO_ASSIGN' | 'OFFER_ACCEPT' | null

  // Feature flags (admin control center) — default OFF for new modules
  features?: {
    customer_portal_enabled?: boolean
    customer_signup_enabled?: boolean
    customer_oauth_google_enabled?: boolean
    customer_oauth_apple_enabled?: boolean
    store_portal_enabled?: boolean
    driver_portal_enabled?: boolean
    sla_timer_enabled?: boolean
    sla_timer_limit_minutes?: number
    modules_enabled?: {
      marketing?: boolean
      accounting?: boolean
      support?: boolean
      users_roles?: boolean
      exports?: boolean
      settlements?: boolean
      campaigns?: boolean
      coupons?: boolean
      ops_console?: boolean
    }
  } | null
}

const KEY = 'public_settings_cache_v1'
const TTL_MS = 10 * 60 * 1000

const DEFAULTS: PublicSettings = {
  brandName: 'TOMO Market',
  supportPhone: null,
  supportWhatsApp: null,
  supportEmail: null,
  supportHours: null,
  social: null,
  paymentMethods: null,
  categories: null,
  dispatchMode: 'AUTO_ASSIGN',
  features: {
    customer_portal_enabled: true,
    customer_signup_enabled: true,
    customer_oauth_google_enabled: false,
    customer_oauth_apple_enabled: false,
    store_portal_enabled: true,
    driver_portal_enabled: true,
    sla_timer_enabled: true,
    sla_timer_limit_minutes: 30,
    modules_enabled: {
      marketing: false,
      accounting: false,
      support: false,
      users_roles: false,
      exports: false,
      settlements: false,
      campaigns: false,
      coupons: false,
      ops_console: true,
    },
  },
  promoStrip: {
    enabled: false,
    textAr: '',
    textEn: '',
    icon: '🔥',
    linkUrl: null,
    linkLabelAr: null,
    linkLabelEn: null,
    variant: 'neutral',
    align: 'center',
    dismissible: true,
    scope: 'all',
    mobileOnly: false,
    startAt: null,
    endAt: null,
  },
  homeHero: { enabled: false, height: 'sm' },
  siteLinks: {
    headerLinks: [
      { key: 'categories', label_ar: 'الأقسام', label_en: 'Categories', href: '/categories', external: false },
      { key: 'products', label_ar: 'جميع المنتجات', label_en: 'Products', href: '/products', external: false },
      { key: 'orders', label_ar: 'طلباتي', label_en: 'Orders', href: '/orders', external: false },
    ],
    footerColumns: [
      {
        title_ar: 'روابط سريعة',
        title_en: 'Links',
        links: [
          { label_ar: 'الرئيسية', label_en: 'Home', href: '/', external: false },
          { label_ar: 'الأقسام', label_en: 'Categories', href: '/categories', external: false },
          { label_ar: 'جميع المنتجات', label_en: 'Products', href: '/products', external: false },
          { label_ar: 'اتصل بنا', label_en: 'Contact', href: '/contact', external: false },
        ],
      },
      {
        title_ar: 'السياسات',
        title_en: 'Policies',
        links: [
          { label_ar: 'الخصوصية', label_en: 'Privacy', href: '/p/privacy', external: false },
          { label_ar: 'الشروط', label_en: 'Terms', href: '/p/terms', external: false },
          { label_ar: 'الاسترجاع', label_en: 'Returns', href: '/p/shipping-returns', external: false },
        ],
      },
      {
        title_ar: 'عن تومو',
        title_en: 'About',
        links: [
          { label_ar: 'من نحن', label_en: 'About', href: '/p/about', external: false },
          { label_ar: 'الدعم', label_en: 'Support', href: '/contact', external: false },
        ],
      },
    ],
    support: {
      whatsappNumber: null,
      whatsappMessageAr: null,
      whatsappMessageEn: null,
    },
    header: {
      showSupportButton: true,
      supportLabelAr: 'خدمة العملاء',
      supportLabelEn: 'Support',
    },
    footer: {
      columns: [
        {
          id: 'about',
          titleAr: 'عن تومو',
          titleEn: 'About',
          links: [
            { id: 'about', labelAr: 'عن تومو', labelEn: 'About', url: '/about', external: false },
            { id: 'shipping', labelAr: 'الشحن والاسترجاع', labelEn: 'Shipping & Returns', url: '/shipping-returns', external: false },
          ],
        },
        {
          id: 'links',
          titleAr: 'روابط سريعة',
          titleEn: 'Links',
          links: [
            { id: 'home', labelAr: 'الرئيسية', labelEn: 'Home', url: '/', external: false },
            { id: 'categories', labelAr: 'الأقسام', labelEn: 'Categories', url: '/categories', external: false },
            { id: 'products', labelAr: 'جميع المنتجات', labelEn: 'Products', url: '/products', external: false },
            { id: 'orders', labelAr: 'تتبع الطلب', labelEn: 'Orders', url: '/orders', external: false },
          ],
        },
        {
          id: 'support',
          titleAr: 'الدعم',
          titleEn: 'Support',
          links: [
            { id: 'contact', labelAr: 'تواصل معنا', labelEn: 'Contact', url: '/contact', external: false },
            { id: 'privacy', labelAr: 'الخصوصية', labelEn: 'Privacy', url: '/p/privacy', external: false },
            { id: 'terms', labelAr: 'الشروط', labelEn: 'Terms', url: '/p/terms', external: false },
          ],
        },
      ],
      trustItems: [
        { id: 'fast', textAr: 'توصيل سريع', textEn: 'Fast delivery', icon: '🚚' },
        { id: 'secure', textAr: 'دفع آمن', textEn: 'Secure payment', icon: '🔒' },
        { id: 'support', textAr: 'دعم عملاء', textEn: 'Support', icon: '📞' },
      ],
    },
  },
  sitePages: [
    { slug: 'privacy', titleAr: '', titleEn: '', contentAr: '', contentEn: '', published: false },
    { slug: 'terms', titleAr: '', titleEn: '', contentAr: '', contentEn: '', published: false },
    { slug: 'about', titleAr: '', titleEn: '', contentAr: '', contentEn: '', published: false },
    { slug: 'faq', titleAr: '', titleEn: '', contentAr: '', contentEn: '', published: false },
    { slug: 'shipping-returns', titleAr: '', titleEn: '', contentAr: '', contentEn: '', published: false },
  ],
  siteSupport: {
    whatsappNumber: null,
    phone: null,
    email: null,
    hours_ar: null,
    hours_en: null,
  },
  trustFeatures: [
    { icon: 'truck', color: '#10b981', labelAr: 'توصيل سريع داخل مدينتك', labelEn: 'Fast delivery in your city', enabled: true },
    { icon: 'lock', color: '#f59e0b', labelAr: 'دفع آمن 100%', labelEn: '100% secure payment', enabled: true },
    { icon: 'phone', color: '#3b82f6', labelAr: 'دعم عملاء متاح', labelEn: 'Customer support available', enabled: true },
  ],
}

function safeParse<T>(raw: string | null): T | null {
  try {
    if (!raw) return null
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}

function cleanStr(v: any): string | null {
  const s = typeof v === 'string' ? v.trim() : ''
  return s ? s : null
}

function normalize(input: any): PublicSettings {
  const s = input && typeof input === 'object' ? input : {}
  const social = {
    twitter: cleanStr(s.social_x ?? s.twitter ?? s.social?.twitter),
    instagram: cleanStr(s.social_instagram ?? s.instagram ?? s.social?.instagram),
  }

  const paymentMethodsRaw = Array.isArray(s.payment_methods)
    ? s.payment_methods
    : Array.isArray(s.paymentMethods)
      ? s.paymentMethods
      : null

  const paymentMethods = paymentMethodsRaw
    ? paymentMethodsRaw
        .map((x: any) => (typeof x === 'string' ? x.trim() : ''))
        .filter((x: string) => !!x)
        .filter((x: string) => x.toLowerCase() !== 'cod' && x !== 'الدفع عند الاستلام')
    : null

  const categories = Array.isArray(s.categories) ? s.categories : null

  const promoStripRaw = (s.promoStrip ?? s.promo_strip) && typeof (s.promoStrip ?? s.promo_strip) === 'object' ? (s.promoStrip ?? s.promo_strip) : null
  const promoStrip = promoStripRaw
    ? {
        enabled: !!promoStripRaw.enabled,
        textAr: String(promoStripRaw.textAr ?? ''),
        textEn: String(promoStripRaw.textEn ?? ''),
        icon: String(promoStripRaw.icon ?? DEFAULTS.promoStrip?.icon ?? '🔥'),
        linkUrl: cleanStr(promoStripRaw.linkUrl),
        linkLabelAr: cleanStr(promoStripRaw.linkLabelAr),
        linkLabelEn: cleanStr(promoStripRaw.linkLabelEn),
        variant: (['neutral', 'success', 'promo', 'warning'] as const).includes(promoStripRaw.variant)
          ? promoStripRaw.variant
          : (DEFAULTS.promoStrip?.variant ?? 'neutral'),
        align: (['center', 'right', 'left'] as const).includes(promoStripRaw.align) ? promoStripRaw.align : (DEFAULTS.promoStrip?.align ?? 'center'),
        dismissible: promoStripRaw.dismissible !== false,
        scope: (promoStripRaw.scope === 'home' ? 'home' : 'all') as 'home' | 'all',
        mobileOnly: !!promoStripRaw.mobileOnly,
        startAt: cleanStr(promoStripRaw.startAt),
        endAt: cleanStr(promoStripRaw.endAt),
      }
    : DEFAULTS.promoStrip

  const homeHeroRaw = (s.homeHero ?? s.home_hero) && typeof (s.homeHero ?? s.home_hero) === 'object' ? (s.homeHero ?? s.home_hero) : null
  const homeHero = homeHeroRaw
    ? {
        enabled: !!homeHeroRaw.enabled,
        height: (['sm', 'md', 'lg'] as const).includes(homeHeroRaw.height) ? homeHeroRaw.height : (DEFAULTS.homeHero?.height ?? 'sm'),
      }
    : DEFAULTS.homeHero

  const siteLinksRaw = (s.siteLinks ?? s.site_links) && typeof (s.siteLinks ?? s.site_links) === 'object' ? (s.siteLinks ?? s.site_links) : null
  const siteLinks = siteLinksRaw ? (siteLinksRaw as any) : DEFAULTS.siteLinks

  const sitePagesRawAny = (s.sitePages ?? s.site_pages) ?? null
  const sitePages = (() => {
    const list = Array.isArray(sitePagesRawAny)
      ? sitePagesRawAny
      : (sitePagesRawAny && typeof sitePagesRawAny === 'object' && Array.isArray((sitePagesRawAny as any).pages))
        ? (sitePagesRawAny as any).pages
        : (DEFAULTS.sitePages || [])
    return (list || [])
      .map((p: any) => {
        if (!p || typeof p !== 'object') return null
        const slug = cleanStr(p.slug) || ''
        if (!slug) return null
        return {
          slug,
          titleAr: String(p.titleAr ?? p.titleAR ?? p.title_ar ?? ''),
          titleEn: String(p.titleEn ?? p.titleEN ?? p.title_en ?? ''),
          contentAr: String(p.contentAr ?? p.contentAR ?? p.bodyArMarkdown ?? p.body_ar_md ?? ''),
          contentEn: String(p.contentEn ?? p.contentEN ?? p.bodyEnMarkdown ?? p.body_en_md ?? ''),
          published: p.published === true || p.enabled === true,
        }
      })
      .filter(Boolean) as any
  })()

  const siteSupportRaw = (s.siteSupport ?? s.site_support) && typeof (s.siteSupport ?? s.site_support) === 'object' ? (s.siteSupport ?? s.site_support) : null
  const siteSupport = siteSupportRaw ? (siteSupportRaw as any) : DEFAULTS.siteSupport

  const trustFeaturesRawAny = (s.trustFeatures ?? s.trust_features) ?? null
  const trustFeatures = Array.isArray(trustFeaturesRawAny)
    ? (trustFeaturesRawAny as any)
    : (trustFeaturesRawAny && typeof trustFeaturesRawAny === 'object' && Array.isArray((trustFeaturesRawAny as any).items))
      ? (trustFeaturesRawAny as any).items
      : DEFAULTS.trustFeatures

  const dispatchModeRaw = String((s.dispatchMode ?? s.dispatch_mode ?? '') || '').trim()
  const dispatchMode = dispatchModeRaw === 'OFFER_ACCEPT' ? 'OFFER_ACCEPT' : 'AUTO_ASSIGN'

  const rawFeatures = s.features && typeof s.features === 'object' ? s.features : {}
  const rawMod = rawFeatures.modules_enabled && typeof rawFeatures.modules_enabled === 'object' ? rawFeatures.modules_enabled : {}
  const features = {
    customer_portal_enabled: typeof rawFeatures.customer_portal_enabled === 'boolean' ? rawFeatures.customer_portal_enabled : (DEFAULTS.features?.customer_portal_enabled !== false),
    customer_signup_enabled: typeof rawFeatures.customer_signup_enabled === 'boolean' ? rawFeatures.customer_signup_enabled : (DEFAULTS.features?.customer_signup_enabled !== false),
    customer_oauth_google_enabled: typeof rawFeatures.customer_oauth_google_enabled === 'boolean' ? rawFeatures.customer_oauth_google_enabled : (DEFAULTS.features?.customer_oauth_google_enabled === true),
    customer_oauth_apple_enabled: typeof rawFeatures.customer_oauth_apple_enabled === 'boolean' ? rawFeatures.customer_oauth_apple_enabled : (DEFAULTS.features?.customer_oauth_apple_enabled === true),
    store_portal_enabled: typeof rawFeatures.store_portal_enabled === 'boolean' ? rawFeatures.store_portal_enabled : (DEFAULTS.features?.store_portal_enabled !== false),
    driver_portal_enabled: typeof rawFeatures.driver_portal_enabled === 'boolean' ? rawFeatures.driver_portal_enabled : (DEFAULTS.features?.driver_portal_enabled !== false),
    sla_timer_enabled: typeof rawFeatures.sla_timer_enabled === 'boolean' ? rawFeatures.sla_timer_enabled : (DEFAULTS.features?.sla_timer_enabled !== false),
    sla_timer_limit_minutes: typeof rawFeatures.sla_timer_limit_minutes === 'number' && rawFeatures.sla_timer_limit_minutes >= 1 && rawFeatures.sla_timer_limit_minutes <= 120 ? rawFeatures.sla_timer_limit_minutes : (DEFAULTS.features?.sla_timer_limit_minutes ?? 30),
    modules_enabled: {
      marketing: rawMod.marketing !== false,
      accounting: rawMod.accounting !== false,
      support: rawMod.support !== false,
      users_roles: rawMod.users_roles !== false,
      exports: rawMod.exports !== false,
      settlements: rawMod.settlements !== false,
      campaigns: rawMod.campaigns !== false,
      coupons: rawMod.coupons !== false,
      ops_console: rawMod.ops_console !== false,
    },
  }

  return {
    brandName: cleanStr(s.brandName ?? s.site_name ?? s.siteName ?? s.brand_name) ?? DEFAULTS.brandName,
    supportPhone: cleanStr(s.supportPhone ?? s.phone ?? s.support_phone),
    supportWhatsApp: cleanStr(s.supportWhatsApp ?? s.whatsapp ?? s.support_whatsapp),
    supportEmail: cleanStr(s.supportEmail ?? s.email ?? s.support_email),
    supportHours: cleanStr(s.supportHours ?? s.hours ?? s.support_hours),
    social: social.twitter || social.instagram ? social : null,
    paymentMethods,
    categories,
    promoStrip,
    homeHero,
    siteLinks,
    sitePages,
    siteSupport,
    trustFeatures,
    dispatchMode,
    features,
  }
}

export async function getPublicSettings(): Promise<PublicSettings> {
  if (typeof window !== 'undefined') {
    const cached = safeParse<{ ts: number; data: PublicSettings }>(localStorage.getItem(KEY))
    if (cached?.ts && cached.data) {
      const age = Date.now() - cached.ts
      if (age >= 0 && age <= TTL_MS) {
        // Return cached quickly, and revalidate in background.
        const fast = { ...DEFAULTS, ...cached.data }
        ;(async () => {
          try {
            const res = await api.get('/api/settings', { timeout: 8000 })
            const raw = (res as any)?.data?.settings ?? (res as any)?.data ?? null
            const fresh = normalize(raw)
            const prev = JSON.stringify(fast)
            const next = JSON.stringify({ ...DEFAULTS, ...fresh })
            if (prev !== next) {
              try {
                localStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), data: fresh }))
              } catch {
                // ignore
              }
              try {
                window.dispatchEvent(new CustomEvent('public-settings-updated', { detail: fresh }))
              } catch {
                // ignore
              }
            }
          } catch {
            // ignore
          }
        })()
        return fast
      }
    }
  }

  try {
    const res = await api.get('/api/settings', { timeout: 8000 })
    const raw = (res as any)?.data?.settings ?? (res as any)?.data ?? null
    const data = normalize(raw)
    try {
      if (typeof window !== 'undefined') localStorage.setItem(KEY, JSON.stringify({ ts: Date.now(), data }))
    } catch {
      // ignore
    }
    try {
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('public-settings-updated', { detail: data }))
    } catch {
      // ignore
    }
    return data
  } catch {
    return { ...DEFAULTS }
  }
}

