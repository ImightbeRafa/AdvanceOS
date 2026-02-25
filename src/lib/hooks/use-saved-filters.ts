'use client'

import { useState, useCallback, useEffect } from 'react'

interface FilterPreset {
  id: string
  name: string
  filters: Record<string, string>
}

export function useSavedFilters(storageKey: string) {
  const [presets, setPresets] = useState<FilterPreset[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`advanceos-filters-${storageKey}`)
      if (stored) setPresets(JSON.parse(stored))
    } catch {
      // ignore
    }
  }, [storageKey])

  const savePreset = useCallback((name: string, filters: Record<string, string>) => {
    const preset: FilterPreset = {
      id: crypto.randomUUID(),
      name,
      filters,
    }
    setPresets((prev) => {
      const next = [...prev, preset]
      localStorage.setItem(`advanceos-filters-${storageKey}`, JSON.stringify(next))
      return next
    })
    return preset
  }, [storageKey])

  const deletePreset = useCallback((id: string) => {
    setPresets((prev) => {
      const next = prev.filter((p) => p.id !== id)
      localStorage.setItem(`advanceos-filters-${storageKey}`, JSON.stringify(next))
      return next
    })
  }, [storageKey])

  return { presets, savePreset, deletePreset }
}
