import React from 'react';
import { motion } from 'framer-motion';

export const Skeleton = ({ className }: { className: string }) => {
  return (
    <motion.div
      className={`bg-gray-200 rounded ${className}`}
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
    />
  );
};

export const CheckoutSkeleton = () => (
  <div className="space-y-6">
    <Skeleton className="h-24 w-full rounded-2xl" />
    <Skeleton className="h-32 w-full rounded-2xl" />
    <Skeleton className="h-32 w-full rounded-2xl" />
    <Skeleton className="h-48 w-full rounded-2xl" />
  </div>
);

export const OrderCardSkeleton = () => (
  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
    <div className="flex justify-between items-center mb-4">
      <div className="flex gap-2">
        <Skeleton className="h-6 w-16 rounded" />
        <Skeleton className="h-6 w-20 rounded" />
      </div>
      <Skeleton className="h-6 w-16 rounded" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-full rounded" />
      <Skeleton className="h-4 w-2/3 rounded" />
    </div>
  </div>
);

