import React from 'react'
import { useLanguage } from '../../context/LanguageContext'
import { TRACKING_STEPS } from '../../hooks/useOrderTracking'
import { OrderTimeline } from '../../shared/order-ui/OrderTimeline'

interface OrderTrackerProps {
  currentStep: number;
}

export const OrderTracker: React.FC<OrderTrackerProps> = ({ currentStep }) => {
  const { language } = useLanguage()
  const step = TRACKING_STEPS.find((s) => s.id === currentStep) || TRACKING_STEPS[0]
  const status = step?.statusKey || 'CREATED'

  return (
    <div className="w-full" dir={language === 'ar' ? 'rtl' : 'ltr'}>
      <OrderTimeline currentStatus={status} lang={language === 'en' ? 'en' : 'ar'} />
    </div>
  )
};

