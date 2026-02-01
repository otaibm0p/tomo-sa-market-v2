import { useEffect, useMemo, useState } from 'react'
import api from '../../utils/api'
import { useLanguage } from '../../context/LanguageContext'
import { Card } from '../../shared/admin/ui/components/Card'
import { SectionHeader } from '../../shared/admin/ui/components/SectionHeader'
import { Button } from '../../shared/admin/ui/components/Button'
import { cx } from '../../shared/admin/ui/tokens'
import { ChevronDown, ChevronUp, Monitor, Smartphone } from 'lucide-react'

type PromoStrip = {
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
}

type HomeHero = { enabled: boolean; height: 'sm' | 'md' | 'lg' }

const defaultPromo: PromoStrip = {
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
}

const defaultHero: HomeHero = { enabled: false, height: 'sm' }

function variantClass(v: PromoStrip['variant']) {
  switch (v) {
    case 'success':
      return 'border-emerald-200 bg-emerald-50 text-emerald-900'
    case 'promo':
      return 'border-violet-200 bg-violet-50 text-violet-900'
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-900'
    default:
      return 'border-gray-200 bg-gray-50 text-gray-900'
  }
}

function getPromoStatus(p: PromoStrip): 'draft' | 'live' | 'scheduled' | 'expired' {
  if (!p.enabled) return 'draft'
  const now = Date.now()
  const start = p.startAt ? Date.parse(p.startAt) : NaN
  const end = p.endAt ? Date.parse(p.endAt) : NaN
  if (Number.isFinite(end) && now > end) return 'expired'
  if (Number.isFinite(start) && now < start) return 'scheduled'
  return 'live'
}

const MAX_TEXT_LEN = 120

export default function PromoStripSettings() {
  const { language } = useLanguage()
  const isRTL = language === 'ar'

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [base, setBase] = useState<any>(null)
  const [promo, setPromo] = useState<PromoStrip>(defaultPromo)
  const [hero, setHero] = useState<HomeHero>(defaultHero)
  const [appearanceOpen, setAppearanceOpen] = useState(false)
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const res = await api.get('/api/settings')
        if (cancelled) return
        const s = res.data || {}
        setBase(s)
        setPromo((s.promoStrip || s.promo_strip || defaultPromo) as PromoStrip)
        setHero((s.homeHero || s.home_hero || defaultHero) as HomeHero)
      } catch {
        if (!cancelled) {
          setBase(null)
          setPromo(defaultPromo)
          setHero(defaultHero)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const title = isRTL ? 'شريط الترويج' : 'Promo Strip'
  const desc = isRTL ? 'تحكم في الشريط الترويجي الذي يظهر في رأس المتجر' : 'Control the promo strip shown in the store header'

  const previewText = isRTL ? promo.textAr : promo.textEn
  const previewLinkLabel = isRTL ? promo.linkLabelAr : promo.linkLabelEn
  const alignClass = promo.align === 'center' ? 'justify-center text-center' : promo.align === 'left' ? 'justify-start text-left' : 'justify-end text-right'

  const status = getPromoStatus(promo)
  const runContinuously = !promo.startAt && !promo.endAt
  const canSave = useMemo(() => !!base && !saving, [base, saving])

  const dateValidation = useMemo(() => {
    const s = promo.startAt ? Date.parse(promo.startAt) : NaN
    const e = promo.endAt ? Date.parse(promo.endAt) : NaN
    if (Number.isFinite(s) && Number.isFinite(e) && e < s)
      return isRTL ? 'وقت النهاية يجب أن يكون بعد وقت البداية' : 'End must be after start'
    return null
  }, [promo.startAt, promo.endAt, isRTL])

  const onSave = async () => {
    if (!base) return
    try {
      setSaving(true)
      const payload = { ...base, promoStrip: promo, homeHero: hero }
      const res = await api.put('/api/settings', payload)
      setBase(res.data || payload)
    } catch {
      // silent
    } finally {
      setSaving(false)
    }
  }

  const onReset = () => {
    setPromo(defaultPromo)
    setHero(defaultHero)
  }

  const setRunContinuously = (on: boolean) => {
    if (on) setPromo((p) => ({ ...p, startAt: null, endAt: null }))
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto">
        <SectionHeader title={title} description={desc} />
        <Card className="p-6">{isRTL ? 'جاري التحميل…' : 'Loading…'}</Card>
      </div>
    )
  }

  const statusLabel = {
    draft: isRTL ? 'مسودة' : 'Draft',
    live: isRTL ? 'مباشر' : 'Live',
    scheduled: isRTL ? 'مجدول' : 'Scheduled',
    expired: isRTL ? 'منتهي' : 'Expired',
  }[status]

  const statusColor = {
    draft: 'bg-gray-100 text-gray-700 border-gray-200',
    live: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    scheduled: 'bg-amber-100 text-amber-800 border-amber-200',
    expired: 'bg-red-100 text-red-800 border-red-200',
  }[status]

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-8" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Sticky action bar */}
      <div className="sticky top-0 z-10 -mx-2 px-2 py-2 bg-gray-50/95 border-b border-gray-200 flex justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onReset}>
          {isRTL ? 'إعادة ضبط' : 'Reset'}
        </Button>
        <Button variant="primary" size="sm" disabled={!canSave} onClick={onSave}>
          {saving ? (isRTL ? 'جارٍ الحفظ…' : 'Saving…') : (isRTL ? 'حفظ' : 'Save')}
        </Button>
      </div>

      <SectionHeader title={title} description={desc} />

      {/* A) Promo Status Card */}
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap items-center gap-6">
            <div>
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                {isRTL ? 'الحالة' : 'Status'}
              </div>
              <span className={cx('inline-flex px-3 py-1 rounded-full text-sm font-bold border', statusColor)}>
                {statusLabel}
              </span>
            </div>
            {(promo.startAt || promo.endAt) && (
              <div className="flex flex-wrap gap-4 text-sm">
                {promo.startAt && (
                  <div>
                    <span className="text-gray-500">{isRTL ? 'يبدأ' : 'Starts'}</span>{' '}
                    <span className="font-medium">{new Date(promo.startAt).toLocaleString(isRTL ? 'ar-SA' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                )}
                {promo.endAt && (
                  <div>
                    <span className="text-gray-500">{isRTL ? 'ينتهي' : 'Ends'}</span>{' '}
                    <span className="font-medium">{new Date(promo.endAt).toLocaleString(isRTL ? 'ar-SA' : 'en-US', { dateStyle: 'short', timeStyle: 'short' })}</span>
                  </div>
                )}
              </div>
            )}
            <div className="text-sm text-gray-600">
              <span className="text-gray-500">{isRTL ? 'الظهور' : 'Visibility'}:</span>{' '}
              {promo.scope === 'all' ? (isRTL ? 'كل الصفحات' : 'All pages') : (isRTL ? 'الرئيسية فقط' : 'Home only')}
              {promo.mobileOnly ? ` · ${isRTL ? 'موبايل فقط' : 'Mobile only'}` : ` · ${isRTL ? 'الجميع' : 'All devices'}`}
            </div>
          </div>
          <Button
            variant={promo.enabled ? 'secondary' : 'primary'}
            size="sm"
            onClick={() => setPromo((p) => ({ ...p, enabled: !p.enabled }))}
          >
            {promo.enabled ? (isRTL ? 'تعطيل' : 'Disable') : (isRTL ? 'تفعيل' : 'Enable')}
          </Button>
        </div>
      </Card>

      {/* Two-column: Form left, Preview right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* B1) Message & CTA */}
          <Card className="p-5">
            <h3 className="text-base font-bold text-gray-900 mb-4">
              {isRTL ? 'الرسالة وزر الإجراء' : 'Message & CTA'}
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{isRTL ? 'النص (عربي)' : 'Text (AR)'}</label>
                  <input
                    value={promo.textAr}
                    onChange={(e) => setPromo((p) => ({ ...p, textAr: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    maxLength={MAX_TEXT_LEN + 50}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {promo.textAr.length}/{MAX_TEXT_LEN} {promo.textAr.length > MAX_TEXT_LEN && (isRTL ? '(طويل)' : '(long)')}
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{isRTL ? 'النص (إنجليزي)' : 'Text (EN)'}</label>
                  <input
                    value={promo.textEn}
                    onChange={(e) => setPromo((p) => ({ ...p, textEn: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-emerald-500"
                    maxLength={MAX_TEXT_LEN + 50}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {promo.textEn.length}/{MAX_TEXT_LEN} {promo.textEn.length > MAX_TEXT_LEN && (isRTL ? '(long)' : '(long)')}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{isRTL ? 'الأيقونة' : 'Icon'}</label>
                  <input
                    value={promo.icon}
                    onChange={(e) => setPromo((p) => ({ ...p, icon: e.target.value }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                    placeholder="🔥"
                  />
                  <p className="text-xs text-gray-500 mt-1">{isRTL ? 'رمز تعبيري واحد' : 'Single emoji'}</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{isRTL ? 'النمط' : 'Variant'}</label>
                  <select
                    value={promo.variant}
                    onChange={(e) => setPromo((p) => ({ ...p, variant: e.target.value as any }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                  >
                    <option value="neutral">neutral</option>
                    <option value="success">success</option>
                    <option value="promo">promo</option>
                    <option value="warning">warning</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{isRTL ? 'رابط CTA (اختياري)' : 'CTA link (optional)'}</label>
                <input
                  value={promo.linkUrl || ''}
                  onChange={(e) => setPromo((p) => ({ ...p, linkUrl: e.target.value || null }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                  placeholder="/products?sort=deals"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">CTA label (AR)</label>
                  <input
                    value={promo.linkLabelAr || ''}
                    onChange={(e) => setPromo((p) => ({ ...p, linkLabelAr: e.target.value || null }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                    placeholder="تسوّق الآن"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">CTA label (EN)</label>
                  <input
                    value={promo.linkLabelEn || ''}
                    onChange={(e) => setPromo((p) => ({ ...p, linkLabelEn: e.target.value || null }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                    placeholder="Shop now"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* B2) Schedule */}
          <Card className="p-5">
            <h3 className="text-base font-bold text-gray-900 mb-4">{isRTL ? 'الجدولة' : 'Schedule'}</h3>
            <div className="space-y-4">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <input
                  type="checkbox"
                  checked={runContinuously}
                  onChange={(e) => setRunContinuously(e.target.checked)}
                />
                {isRTL ? 'تشغيل مستمر (بدون بداية/نهاية)' : 'Run continuously'}
              </label>
              {!runContinuously && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">{isRTL ? 'يبدأ في' : 'Start at'}</label>
                    <input
                      type="datetime-local"
                      value={promo.startAt ? promo.startAt.slice(0, 16) : ''}
                      onChange={(e) => setPromo((p) => ({ ...p, startAt: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">{isRTL ? 'ينتهي في' : 'End at'}</label>
                    <input
                      type="datetime-local"
                      value={promo.endAt ? promo.endAt.slice(0, 16) : ''}
                      onChange={(e) => setPromo((p) => ({ ...p, endAt: e.target.value ? new Date(e.target.value).toISOString() : null }))}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                    />
                    {dateValidation && (
                      <p className="text-xs text-red-600 mt-1">{dateValidation}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* B3) Appearance (Advanced) - collapsed by default */}
          <Card className="p-5">
            <button
              type="button"
              className="w-full flex items-center justify-between text-left"
              onClick={() => setAppearanceOpen((o) => !o)}
            >
              <h3 className="text-base font-bold text-gray-900">
                {isRTL ? 'المظهر (متقدم)' : 'Appearance (Advanced)'}
              </h3>
              {appearanceOpen ? <ChevronUp className="w-5 h-5 text-gray-500" /> : <ChevronDown className="w-5 h-5 text-gray-500" />}
            </button>
            {appearanceOpen && (
              <div className="mt-4 pt-4 border-t border-gray-200 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">{isRTL ? 'محاذاة' : 'Align'}</label>
                  <select
                    value={promo.align}
                    onChange={(e) => setPromo((p) => ({ ...p, align: e.target.value as any }))}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                  >
                    <option value="center">{isRTL ? 'وسط' : 'center'}</option>
                    <option value="right">{isRTL ? 'يمين' : 'right'}</option>
                    <option value="left">{isRTL ? 'يسار' : 'left'}</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={promo.dismissible}
                    onChange={(e) => setPromo((p) => ({ ...p, dismissible: e.target.checked }))}
                  />
                  {isRTL ? 'قابل للإغلاق من قبل العميل' : 'Dismissible by customer'}
                </label>
              </div>
            )}
          </Card>

          {/* B4) Visibility */}
          <Card className="p-5">
            <h3 className="text-base font-bold text-gray-900 mb-4">{isRTL ? 'الظهور' : 'Visibility'}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">{isRTL ? 'الصفحات' : 'Pages'}</label>
                <select
                  value={promo.scope}
                  onChange={(e) => setPromo((p) => ({ ...p, scope: e.target.value as any }))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none"
                >
                  <option value="all">{isRTL ? 'كل الصفحات' : 'All pages'}</option>
                  <option value="home">{isRTL ? 'الرئيسية فقط' : 'Home only'}</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">{isRTL ? 'أين يظهر الشريط' : 'Where the strip is shown'}</p>
              </div>
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <input
                    type="checkbox"
                    checked={promo.mobileOnly}
                    onChange={(e) => setPromo((p) => ({ ...p, mobileOnly: e.target.checked }))}
                  />
                  {isRTL ? 'موبايل فقط' : 'Mobile only'}
                </label>
                <p className="text-xs text-gray-500 mt-1">{isRTL ? 'إخفاء على الشاشات الكبيرة' : 'Hide on desktop'}</p>
              </div>
            </div>
          </Card>

          {/* Home Hero (unchanged) */}
          <Card className="p-5">
            <div className="text-sm font-extrabold text-gray-900 mb-3">{isRTL ? 'Home Hero (اختياري)' : 'Home Hero (optional)'}</div>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                <input type="checkbox" checked={hero.enabled} onChange={(e) => setHero((h) => ({ ...h, enabled: e.target.checked }))} />
                {isRTL ? 'تفعيل البنر' : 'Enable banner'}
              </label>
              <div className="flex items-center gap-2">
                <div className="text-xs font-bold text-gray-700">{isRTL ? 'الارتفاع' : 'Height'}</div>
                <select
                  value={hero.height}
                  onChange={(e) => setHero((h) => ({ ...h, height: e.target.value as any }))}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-bold outline-none"
                >
                  <option value="sm">sm</option>
                  <option value="md">md</option>
                  <option value="lg">lg</option>
                </select>
              </div>
            </div>
          </Card>
        </div>

        {/* C) Preview - right column, matches store header */}
        <div className="lg:col-span-1">
          <Card className="p-4 sticky top-24">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-gray-900">{isRTL ? 'معاينة' : 'Preview'}</span>
              <div className="inline-flex rounded-lg border border-gray-200 bg-gray-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewDevice('desktop')}
                  className={cx(
                    'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold',
                    previewDevice === 'desktop' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
                  )}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  {isRTL ? 'سطح المكتب' : 'Desktop'}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewDevice('mobile')}
                  className={cx(
                    'flex items-center gap-1 px-2 py-1 rounded-md text-xs font-bold',
                    previewDevice === 'mobile' ? 'bg-white shadow text-gray-900' : 'text-gray-600'
                  )}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  {isRTL ? 'موبايل' : 'Mobile'}
                </button>
              </div>
            </div>
            <div
              className={cx(
                'rounded-xl border-2 border-gray-200 bg-white overflow-hidden',
                previewDevice === 'mobile' ? 'max-w-[320px]' : 'w-full'
              )}
            >
              {/* Mimics real store header strip */}
              <div className={cx('border-b border-slate-200 bg-white', promo.mobileOnly && previewDevice === 'desktop' ? 'opacity-50' : '')}>
                <div className={previewDevice === 'mobile' ? 'px-3 py-2' : 'max-w-[1200px] mx-auto px-4 py-2'}>
                  <div className={cx('rounded-2xl border px-3 py-2', variantClass(promo.variant))}>
                    <div className={cx('flex items-center gap-2', alignClass)}>
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">{promo.icon || '🔥'}</span>
                        <div className="text-sm font-extrabold truncate">
                          {previewText || (isRTL ? 'نص تجريبي…' : 'Preview text…')}
                        </div>
                      </div>
                      <div className="flex-1" />
                      {promo.linkUrl && previewLinkLabel ? (
                        <span className="shrink-0 px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-extrabold">
                          {previewLinkLabel}
                        </span>
                      ) : null}
                      {promo.dismissible ? (
                        <span className="shrink-0 w-9 h-9 rounded-xl border border-slate-200 bg-white/70 flex items-center justify-center font-extrabold text-slate-700">×</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
              {promo.mobileOnly && previewDevice === 'desktop' && (
                <p className="text-xs text-amber-600 px-2 py-1 bg-amber-50 border-t border-amber-200">
                  {isRTL ? 'الشريط مخفي على سطح المكتب (موبايل فقط)' : 'Strip hidden on desktop (mobile only)'}
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
