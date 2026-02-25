'use client'

import { useCurrencyStore } from '@/lib/hooks/use-currency'
import { Button } from '@/components/ui/button'
import { DollarSign } from 'lucide-react'

export function CurrencyToggle() {
  const { currency, toggleCurrency } = useCurrencyStore()

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleCurrency}
      className="gap-1 text-xs"
    >
      <DollarSign className="h-3 w-3" />
      {currency}
    </Button>
  )
}
