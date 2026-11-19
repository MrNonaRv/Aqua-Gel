export const formatCurrency = (amount: number | string | undefined): string => {
  if (amount === undefined || amount === null) return '0.00';
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return isNaN(num)
    ? '0.00'
    : num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const roundToTwo = (num: number): number => {
  return Math.round(num * 100) / 100;
};
