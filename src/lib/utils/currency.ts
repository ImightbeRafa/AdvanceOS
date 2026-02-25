const usdFormatter = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

const crcFormatter = new Intl.NumberFormat('es-CR', {
  style: 'currency',
  currency: 'CRC',
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
})

export function formatUSD(amount: number): string {
  return usdFormatter.format(amount)
}

export function formatCRC(amount: number, exchangeRate: number): string {
  return crcFormatter.format(amount * exchangeRate)
}

export function formatCurrency(
  amount: number,
  currency: 'USD' | 'CRC',
  exchangeRate: number = 1
): string {
  if (currency === 'CRC') {
    return formatCRC(amount, exchangeRate)
  }
  return formatUSD(amount)
}

export function calculateTilopayFee(
  grossAmount: number,
  installmentMonths: number | null
): { feePercentage: number; feeAmount: number; netAmount: number } {
  if (!installmentMonths) {
    return { feePercentage: 0, feeAmount: 0, netAmount: grossAmount }
  }

  const feeTable: Record<number, number> = { 3: 0.075, 6: 0.10, 12: 0.14 }
  const feePercentage = feeTable[installmentMonths] ?? 0
  const feeAmount = grossAmount * feePercentage
  const netAmount = grossAmount - feeAmount

  return { feePercentage, feeAmount, netAmount }
}

export function calculateCommission(
  netAmount: number,
  role: 'setter' | 'closer'
): number {
  const rates = { setter: 0.05, closer: 0.10 }
  return netAmount * rates[role]
}
