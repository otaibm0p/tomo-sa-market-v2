import { useState, useEffect } from 'react';
import { MVP_STATUS_ORDER, STATUS_LABELS, normalizeOrderStatus } from '../shared/orderStatus'

export interface TrackingStep {
  id: number;
  labelAr: string;
  labelEn: string;
  statusKey: string;
  icon: string;
}

export const TRACKING_STEPS: TrackingStep[] = [
  { id: 1, labelAr: STATUS_LABELS.CREATED.ar, labelEn: STATUS_LABELS.CREATED.en, statusKey: 'CREATED', icon: '📝' },
  { id: 2, labelAr: STATUS_LABELS.ACCEPTED.ar, labelEn: STATUS_LABELS.ACCEPTED.en, statusKey: 'ACCEPTED', icon: '✅' },
  { id: 3, labelAr: STATUS_LABELS.PREPARING.ar, labelEn: STATUS_LABELS.PREPARING.en, statusKey: 'PREPARING', icon: '🍳' },
  { id: 4, labelAr: STATUS_LABELS.READY.ar, labelEn: STATUS_LABELS.READY.en, statusKey: 'READY', icon: '📦' },
  { id: 5, labelAr: STATUS_LABELS.ASSIGNED.ar, labelEn: STATUS_LABELS.ASSIGNED.en, statusKey: 'ASSIGNED', icon: '🛵' },
  { id: 6, labelAr: STATUS_LABELS.PICKED_UP.ar, labelEn: STATUS_LABELS.PICKED_UP.en, statusKey: 'PICKED_UP', icon: '📍' },
  { id: 7, labelAr: STATUS_LABELS.DELIVERED.ar, labelEn: STATUS_LABELS.DELIVERED.en, statusKey: 'DELIVERED', icon: '🏁' },
];

export const useOrderTracking = (
  status: string, 
  createdAt: string, 
  etaMinutes: number = 45,
  paidAt?: string | null,
  deliveredAt?: string | null,
  slaSettings?: {
    target_minutes?: number
    yellow_threshold?: number
    red_threshold?: number
  }
) => {
  const [timeLeft, setTimeLeft] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerColor, setTimerColor] = useState<'green' | 'yellow' | 'red'>('green');
  const normalized = normalizeOrderStatus(status) || 'CREATED'
  const currentStep = TRACKING_STEPS.findIndex(step => step.statusKey === normalized) + 1;
  
  // Handle completed/cancelled cases
  const isCompleted = normalized === 'DELIVERED';
  const isCancelled = normalized === 'CANCELLED';
  const isActive = !isCompleted && !isCancelled;

  useEffect(() => {
    if (!isActive) {
      // If delivered, calculate total elapsed time
      if (deliveredAt && paidAt) {
        const paid = new Date(paidAt).getTime();
        const delivered = new Date(deliveredAt).getTime();
        const elapsed = Math.max(0, Math.ceil((delivered - paid) / (1000 * 60)));
        setElapsedTime(elapsed);
        // Determine color based on SLA
        const target = slaSettings?.target_minutes || etaMinutes;
        if (elapsed > target) {
          setTimerColor('red');
        } else if (elapsed > (target * 0.8)) {
          setTimerColor('yellow');
        } else {
          setTimerColor('green');
        }
      }
      return;
    }

    const calculateTime = () => {
      // Use paid_at if available, otherwise fallback to created_at
      const startTime = paidAt ? new Date(paidAt).getTime() : new Date(createdAt).getTime();
      const now = new Date().getTime();
      
      // Calculate elapsed time since payment
      const elapsed = Math.max(0, Math.ceil((now - startTime) / (1000 * 60)));
      setElapsedTime(elapsed);
      
      // Use SLA target if available, otherwise use etaMinutes
      const targetMinutes = slaSettings?.target_minutes || etaMinutes;
      const target = startTime + (targetMinutes * 60 * 1000);
      const diff = target - now;
      const remaining = Math.max(0, Math.ceil(diff / (1000 * 60)));
      
      // Determine color based on remaining time and thresholds
      const yellowThreshold = slaSettings?.yellow_threshold || (targetMinutes * 0.8);
      const redThreshold = slaSettings?.red_threshold || (targetMinutes * 0.5);
      
      if (remaining <= redThreshold || elapsed >= targetMinutes) {
        setTimerColor('red');
      } else if (remaining <= yellowThreshold) {
        setTimerColor('yellow');
      } else {
        setTimerColor('green');
      }
      
      return remaining;
    };

    setTimeLeft(calculateTime());
    const interval = setInterval(() => {
      setTimeLeft(calculateTime());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [createdAt, paidAt, deliveredAt, etaMinutes, isActive, slaSettings]);

  return {
    currentStep: isCompleted ? TRACKING_STEPS.length : (currentStep || 1),
    timeLeft,
    elapsedTime,
    timerColor,
    isActive,
    isCompleted,
    isCancelled,
    steps: TRACKING_STEPS
  };
};

