const adminNavAr = {
  title: 'نظام تومو',
  subtitle: 'لوحة التشغيل',
  sections: {
    overview: 'نظرة عامة',
    operations: 'العمليات',
    intelligence: 'الذكاء',
    control: 'التحكم',
  },
  items: {
    dashboard: 'لوحة التحكم',
    orders: 'الطلبات',
    liveDispatch: 'التوزيع المباشر',
    missionControl: 'مركز القيادة',
    opsDigest: 'ملخص العمليات',
    guardrails: 'الحواجز',
    opsMonitor: 'مراقبة التشغيل',
    catalogWatch: 'مراقبة الكتالوج',
    profitGuard: 'حارس الربح',
    adminCopilot: 'مساعد الأدمن',
    products: 'المنتجات',
    stores: 'المتاجر',
    controlCenter: 'مركز التحكم',
  },
  productsEmpty: {
    title: 'لا توجد بيانات منتجات حالياً',
    subtitle: 'ستعمل هذه الصفحة تلقائياً عند توفر بيانات المتاجر والمنتجات',
    retry: 'إعادة المحاولة',
  },
} as const

export default adminNavAr

