import React from 'react';
import { useLanguage } from '../../context/LanguageContext';

interface LiveTimerProps {
  minutes: number;
}

export const LiveTimer: React.FC<LiveTimerProps> = ({ minutes }) => {
  const { language } = useLanguage();

  if (minutes <= 0) return null;

  return (
    <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 flex items-center gap-2 animate-pulse">
      <span className="text-lg">⏳</span>
      <div className="flex flex-col items-start leading-none">
        <span className="text-[10px] text-orange-600 font-bold uppercase tracking-wider">
          {language === 'ar' ? 'الوقت المتبقي' : 'Estimated Time'}
        </span>
        <span className="text-sm font-bold text-orange-700">
           {minutes} {language === 'ar' ? 'دقيقة' : 'min'}
        </span>
      </div>
    </div>
  );
};

