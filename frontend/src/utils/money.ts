/** Format amounts in South African Rand (ZAR). */
export function formatZAR(amount: string | number, fractionDigits = 2): string {
  const value = Number(amount);
  return `R${value.toLocaleString('en-ZA', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })}`;
}
