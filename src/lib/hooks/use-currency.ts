'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface CurrencyStore {
  currency: 'USD' | 'CRC'
  exchangeRate: number
  toggleCurrency: () => void
  setExchangeRate: (rate: number) => void
}

export const useCurrencyStore = create<CurrencyStore>()(
  persist(
    (set) => ({
      currency: 'USD',
      exchangeRate: 530,
      toggleCurrency: () =>
        set((state) => ({
          currency: state.currency === 'USD' ? 'CRC' : 'USD',
        })),
      setExchangeRate: (rate) => set({ exchangeRate: rate }),
    }),
    { name: 'advanceos-currency' }
  )
)
