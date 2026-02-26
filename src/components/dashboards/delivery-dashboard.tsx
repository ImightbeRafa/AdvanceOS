'use client'

import type { Profile, Client } from '@/types'
import { StatusChip } from '@/components/shared/status-chip'
import { CLIENT_STATUS_LABELS, CLIENT_STATUS_COLORS } from '@/lib/constants'
import { Users, Layers } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface PhaseInfo {
  client_id: string
  phase_name: string
  start_date: string
  end_date: string
  order: number
}

interface DeliveryDashboardProps {
  profile: Profile
  clients: Client[]
  phases: PhaseInfo[]
}

function getCurrentPhase(clientPhases: PhaseInfo[]): string | null {
  if (clientPhases.length === 0) return null
  const today = new Date().toISOString().split('T')[0]
  const active = clientPhases.find((p) => p.start_date <= today && p.end_date >= today)
  if (active) return active.phase_name
  const future = clientPhases.find((p) => p.start_date > today)
  if (future) return future.phase_name
  return clientPhases[clientPhases.length - 1].phase_name
}

export function DeliveryDashboard({ profile, clients, phases }: DeliveryDashboardProps) {
  const phasesByClient = phases.reduce<Record<string, PhaseInfo[]>>((acc, p) => {
    if (!acc[p.client_id]) acc[p.client_id] = []
    acc[p.client_id].push(p)
    return acc
  }, {})

  const advance90Clients = clients.filter((c) => c.service === 'advance90')
  const phaseGroups: Record<string, Client[]> = {}
  for (const client of advance90Clients) {
    const phaseName = getCurrentPhase(phasesByClient[client.id] ?? []) ?? 'Sin fase'
    if (!phaseGroups[phaseName]) phaseGroups[phaseName] = []
    phaseGroups[phaseName].push(client)
  }

  const activeClients = clients.filter((c) => ['onboarding', 'activo'].includes(c.status))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Hola, {profile.full_name.split(' ')[0]}</h1>
        <p className="text-muted-foreground">Tus clientes asignados y cronogramas.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><Users className="h-4 w-4" /><span className="text-sm">Clientes asignados</span></div>
          <p className="mt-1 text-2xl font-bold">{clients.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-success"><Users className="h-4 w-4" /><span className="text-sm">Activos / Onboarding</span></div>
          <p className="mt-1 text-2xl font-bold">{activeClients.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface-1 p-4">
          <div className="flex items-center gap-2 text-muted-foreground"><Layers className="h-4 w-4" /><span className="text-sm">Advance90</span></div>
          <p className="mt-1 text-2xl font-bold">{advance90Clients.length}</p>
        </div>
      </div>

      {Object.keys(phaseGroups).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Clientes por fase (Advance90)</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(phaseGroups).map(([phaseName, phaseClients]) => (
              <div key={phaseName} className="rounded-xl border border-border bg-surface-1 p-4">
                <h3 className="text-sm font-medium text-muted-foreground mb-2">{phaseName}</h3>
                <div className="space-y-1">
                  {phaseClients.map((c) => (
                    <Link key={c.id} href={`/clientes/${c.id}`} className="flex items-center justify-between text-sm hover:bg-surface-2 rounded-lg p-1.5 -mx-1.5 transition-colors">
                      <span>{c.business_name}</span>
                      <StatusChip label={CLIENT_STATUS_LABELS[c.status]} colorClass={CLIENT_STATUS_COLORS[c.status]} size="sm" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Mis clientes</h2>
          <Link href="/clientes"><Button size="sm" variant="outline">Ver todos</Button></Link>
        </div>
        {clients.length === 0 ? (
          <div className="rounded-xl border border-border bg-surface-1 p-6 text-center text-sm text-muted-foreground">
            No tenés clientes asignados.
          </div>
        ) : (
          <div className="space-y-2">
            {clients.map((c) => (
              <Link key={c.id} href={`/clientes/${c.id}`} className="block rounded-xl border border-border bg-surface-1 p-3 hover:bg-surface-2 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-medium text-sm">{c.business_name}</span>
                    <p className="text-xs text-muted-foreground">{c.service === 'advance90' ? 'Advance90' : c.service === 'meta_advance' ? 'Meta Advance' : 'Retención'}</p>
                  </div>
                  <StatusChip label={CLIENT_STATUS_LABELS[c.status]} colorClass={CLIENT_STATUS_COLORS[c.status]} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
