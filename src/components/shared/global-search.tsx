'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import { Users, Target, Phone, Settings } from 'lucide-react'

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{
    clients: { id: string; business_name: string; ig: string }[]
    sets: { id: string; prospect_name: string; prospect_ig: string }[]
  }>({ clients: [], sets: [] })

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  const search = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults({ clients: [], sets: [] })
      return
    }

    const supabase = createClient()
    const pattern = `%${term}%`

    const [clientsRes, setsRes] = await Promise.all([
      supabase
        .from('clients')
        .select('id, business_name, ig')
        .or(`business_name.ilike.${pattern},ig.ilike.${pattern},whatsapp.ilike.${pattern}`)
        .limit(5),
      supabase
        .from('sets')
        .select('id, prospect_name, prospect_ig')
        .or(`prospect_name.ilike.${pattern},prospect_ig.ilike.${pattern},prospect_whatsapp.ilike.${pattern}`)
        .limit(5),
    ])

    setResults({
      clients: clientsRes.data ?? [],
      sets: setsRes.data ?? [],
    })
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => search(query), 300)
    return () => clearTimeout(timer)
  }, [query, search])

  function navigate(path: string) {
    setOpen(false)
    setQuery('')
    router.push(path)
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Buscar clientes, sets, WhatsApp, IG..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>Sin resultados.</CommandEmpty>

        <CommandGroup heading="Acciones rápidas">
          <CommandItem onSelect={() => navigate('/ventas')}>
            <Target className="mr-2 h-4 w-4" />
            Crear set
          </CommandItem>
          <CommandItem onSelect={() => navigate('/clientes')}>
            <Users className="mr-2 h-4 w-4" />
            Ver clientes
          </CommandItem>
          <CommandItem onSelect={() => navigate('/ajustes')}>
            <Settings className="mr-2 h-4 w-4" />
            Ajustes
          </CommandItem>
        </CommandGroup>

        {results.clients.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Clientes">
              {results.clients.map((c) => (
                <CommandItem key={c.id} onSelect={() => navigate(`/clientes/${c.id}`)}>
                  <Users className="mr-2 h-4 w-4" />
                  <span>{c.business_name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">@{c.ig}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {results.sets.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Sets">
              {results.sets.map((s) => (
                <CommandItem key={s.id} onSelect={() => navigate('/ventas')}>
                  <Phone className="mr-2 h-4 w-4" />
                  <span>{s.prospect_name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">@{s.prospect_ig}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
