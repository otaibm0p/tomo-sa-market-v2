/** Premium Operating OS theme: primary (tomo green), neutral, surface, status */

/** Safe Dark Accents: reversible UI-only theme (sidebar/bar/headers darker; content stays light) */
export type AdminThemeMode = 'light' | 'dark_accents'
export const ADMIN_THEME_STORAGE_KEY = 'tomo_admin_theme'
const DEFAULT_ADMIN_THEME: AdminThemeMode = 'light'

export function getAdminTheme(): AdminThemeMode {
  if (typeof window === 'undefined') return DEFAULT_ADMIN_THEME
  const v = localStorage.getItem(ADMIN_THEME_STORAGE_KEY)
  return v === 'dark_accents' ? 'dark_accents' : 'light'
}

export function applyAdminTheme(mode: AdminThemeMode): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-admin-theme', mode)
  localStorage.setItem(ADMIN_THEME_STORAGE_KEY, mode)
}

export const adminTokens = {
  spacing: {
    page: 'p-4 md:p-6',
    card: 'p-4',
    cardSm: 'p-3',
    gap: 'gap-4',
  },
  radius: {
    card: 'rounded-2xl',
    cardLg: 'rounded-2xl',
    cardXl: 'rounded-2xl',
    pill: 'rounded-full',
    control: 'rounded-xl',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
  },
  shadow: {
    card: 'shadow-sm',
    cardPremium: 'shadow-md',
    subtle: 'shadow-sm',
    premium: 'shadow-lg shadow-gray-200/50',
    pop: 'shadow-xl',
  },
  surfaces: {
    background: 'bg-gray-50/95',
    card: 'bg-white',
    elevated: 'bg-white',
    subtle: 'bg-gray-50/80',
  },
  borders: {
    soft: 'border border-gray-100',
    strong: 'border border-gray-200',
    subtle: 'border border-gray-100',
  },
  focus: {
    ring: 'focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-offset-2',
    ringInside: 'focus:outline-none focus:ring-2 focus:ring-primary/30',
  },
  /** primary = tomo green; neutral = gray bg; surface = card; border; text; muted */
  color: {
    primary: 'text-[#047857]',
    primaryBg: 'bg-[#047857]',
    primaryBorder: 'border-[#047857]',
    page: 'bg-gray-50/95',
    neutral: 'bg-gray-100',
    surface: 'bg-white',
    panel: 'bg-white',
    border: 'border border-gray-100',
    borderStrong: 'border border-gray-200',
    text: 'text-gray-900',
    textStrong: 'text-slate-900',
    textMuted: 'text-slate-600',
    muted: 'text-slate-600',
    /** للوصف والهدف اليومي: أوضح من muted مع وزن 500 */
    secondary: 'text-slate-600 font-medium',
  },
  typography: {
    base: 'text-[15px]',
    /** 1.125rem, 700, slate-900 — ثقة + وضوح */
    sectionTitle: 'text-[1.125rem] font-bold text-slate-900',
    pageTitle: 'text-xl md:text-2xl font-extrabold text-slate-900',
    /** 1.75rem, 800, tracking -0.01em — الرقم يضرب العين */
    kpiValue: 'text-[1.75rem] md:text-[2rem] font-extrabold tracking-[-0.01em] tabular-nums',
    kpiLabel: 'text-xs font-semibold tracking-wide',
  },
  text: {
    pageTitle: 'text-admin-page font-semibold text-slate-900',
    sectionTitle: 'text-admin-section font-medium text-slate-800',
    body: 'text-admin-body text-[15px] text-slate-800',
    meta: 'text-admin-meta text-slate-600',
    h1: 'text-2xl md:text-3xl font-bold',
    h2: 'text-lg font-bold',
    h3: 'text-sm font-bold',
    bodyLegacy: "font-['Tajawal']",
  },
  primary: 'text-[#047857]',
  status: {
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/30',
      border: 'border-emerald-200 dark:border-emerald-800',
      text: 'text-emerald-800 dark:text-emerald-200',
      dot: 'bg-[#047857]',
    },
    warn: {
      bg: 'bg-amber-50 dark:bg-amber-950/30',
      border: 'border-amber-200 dark:border-amber-800',
      text: 'text-amber-800 dark:text-amber-200',
      dot: 'bg-amber-500',
    },
    danger: {
      bg: 'bg-rose-50 dark:bg-rose-950/30',
      border: 'border-rose-200 dark:border-rose-800',
      text: 'text-rose-800 dark:text-rose-200',
      dot: 'bg-rose-500',
    },
    info: {
      bg: 'bg-blue-50 dark:bg-blue-950/30',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      dot: 'bg-blue-500',
    },
  },
} as const

export type StatusVariant = 'success' | 'warn' | 'danger' | 'info'
export function statusClasses(variant: StatusVariant) {
  const s = adminTokens.status[variant]
  return `${s.bg} ${s.border} ${s.text}`
}

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

