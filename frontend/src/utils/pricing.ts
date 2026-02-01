export const PricingUtils = {
  calculateSubtotal: (items: { quantity: number; product: { price: string | number } }[]) => {
    return items.reduce((sum, item) => sum + Number(item.product.price) * item.quantity, 0);
  },

  calculateDeliveryFee: (subtotal: number, threshold: number, baseFee: number) => {
    return subtotal >= threshold ? 0 : baseFee;
  },

  calculateTax: (subtotal: number, rate: number) => {
    return subtotal * rate;
  },

  calculateGrandTotal: (subtotal: number, deliveryFee: number, tax: number) => {
    return subtotal + deliveryFee + tax;
  },

  calculateFreeDeliveryProgress: (subtotal: number, threshold: number) => {
    return Math.max(0, threshold - subtotal);
  },

  calculateFreeDeliveryPercentage: (subtotal: number, threshold: number) => {
    if (threshold <= 0) return 100;
    return Math.min(100, (subtotal / threshold) * 100);
  }
};

