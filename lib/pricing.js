
export function applyVat(amountExVat, vatPercent) {
  return Math.round((amountExVat * (1 + vatPercent / 100)) * 100) / 100;
}
export function formatCurrency(amount, currency = 'GBP') {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount);
}
export function convertFromGBP(amountGBP, fx, target='GBP') {
  const rate = fx?.[target] ?? 1;
  return Math.round(amountGBP * rate * 100) / 100;
}
