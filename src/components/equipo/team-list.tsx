'use client'

import { useState } from 'react'
import type { Profile } from '@/types'
import { DataTable, type Column } from '@/components/shared/data-table'
import { StatusChip } from '@/components/shared/status-chip'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants'
import { formatUSD } from '@/lib/utils/currency'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Eye, Pencil } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { TeamMemberDrawer } from './team-member-drawer'
import { EditTeamMemberModal } from './edit-team-member-modal'

interface TeamListProps {
  members: Profile[]
}

export function TeamList({ members }: TeamListProps) {
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null)
  const [editingMember, setEditingMember] = useState<Profile | null>(null)

  const columns: Column<Profile>[] = [
    {
      key: 'name',
      label: 'Nombre',
      sortable: true,
      render: (m) => <span className="font-medium">{m.full_name}</span>,
      getValue: (m) => m.full_name,
    },
    {
      key: 'role',
      label: 'Rol',
      render: (m) => (
        <StatusChip label={ROLE_LABELS[m.role]} colorClass={ROLE_COLORS[m.role]} />
      ),
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      render: (m) => (
        <a
          href={`https://wa.me/${m.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {m.whatsapp}
        </a>
      ),
    },
    {
      key: 'salary',
      label: 'Salario',
      sortable: true,
      render: (m) => (
        <span className="text-sm">
          {m.salary ? formatUSD(m.salary) : '—'}
        </span>
      ),
      getValue: (m) => m.salary ?? 0,
    },
    {
      key: 'status',
      label: 'Estado',
      render: (m) => (
        <StatusChip
          label={m.active ? 'Activo' : 'Inactivo'}
          colorClass={m.active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}
        />
      ),
    },
  ]

  return (
    <>
      <DataTable
        data={members}
        columns={columns}
        searchPlaceholder="Buscar miembro..."
        searchKeys={['full_name', 'whatsapp']}
        onRowClick={setSelectedMember}
        rowActions={(member) => (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-surface-2">
              <DropdownMenuItem onClick={() => setSelectedMember(member)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver perfil
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditingMember(member)}>
                <Pencil className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      />

      <TeamMemberDrawer
        member={selectedMember}
        open={!!selectedMember}
        onOpenChange={(open) => !open && setSelectedMember(null)}
        userRole="admin"
      />

      <EditTeamMemberModal
        member={editingMember}
        open={!!editingMember}
        onOpenChange={(open) => !open && setEditingMember(null)}
      />
    </>
  )
}
