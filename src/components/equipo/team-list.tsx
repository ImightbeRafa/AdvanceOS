'use client'

import { useState } from 'react'
import type { Profile, UserRole } from '@/types'
import { DataTable, type Column } from '@/components/shared/data-table'
import { StatusChip } from '@/components/shared/status-chip'
import { ConfirmModal } from '@/components/shared/confirm-modal'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants'
import { formatUSD } from '@/lib/utils/currency'
import { resendInvite, deactivateUser, reactivateUser } from '@/lib/actions/invite'
import { Button } from '@/components/ui/button'
import {
  MoreHorizontal, Eye, Pencil, UserPlus, MailPlus,
  UserX, UserCheck, Copy, Check,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'

const TeamMemberDrawer = dynamic<{ member: Profile | null; open: boolean; onOpenChange: (open: boolean) => void; userRole?: UserRole }>(
  () => import('./team-member-drawer').then(m => ({ default: m.TeamMemberDrawer }))
)
const EditTeamMemberModal = dynamic<{ member: Profile | null; open: boolean; onOpenChange: (open: boolean) => void }>(
  () => import('./edit-team-member-modal').then(m => ({ default: m.EditTeamMemberModal }))
)
const InviteMemberModal = dynamic<{ open: boolean; onOpenChange: (open: boolean) => void; onLinkGenerated?: (link: string) => void }>(
  () => import('./invite-member-modal').then(m => ({ default: m.InviteMemberModal }))
)

interface TeamListProps {
  members: Profile[]
}

export function TeamList({ members }: TeamListProps) {
  const [selectedMember, setSelectedMember] = useState<Profile | null>(null)
  const [editingMember, setEditingMember] = useState<Profile | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [deactivatingMember, setDeactivatingMember] = useState<Profile | null>(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [magicLink, setMagicLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  async function handleResendInvite(member: Profile) {
    if (!member.email) return
    setActionLoading(true)
    try {
      const { link } = await resendInvite(member.id, member.email)
      setMagicLink(link)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al generar enlace')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleDeactivate() {
    if (!deactivatingMember) return
    setActionLoading(true)
    try {
      await deactivateUser(deactivatingMember.id)
      toast.success(`${deactivatingMember.full_name} desactivado`)
      setDeactivatingMember(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al desactivar usuario')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleReactivate(member: Profile) {
    setActionLoading(true)
    try {
      await reactivateUser(member.id)
      toast.success(`${member.full_name} reactivado`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al reactivar usuario')
    } finally {
      setActionLoading(false)
    }
  }

  async function copyLink() {
    if (!magicLink) return
    await navigator.clipboard.writeText(magicLink)
    setCopied(true)
    toast.success('Enlace copiado')
    setTimeout(() => setCopied(false), 2000)
  }

  function handleLinkGenerated(link: string) {
    setMagicLink(link)
  }

  const columns: Column<Profile>[] = [
    {
      key: 'name',
      label: 'Nombre',
      sortable: true,
      render: (m) => (
        <span className={`font-medium ${!m.active ? 'text-muted-foreground line-through' : ''}`}>
          {m.full_name}
        </span>
      ),
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
      render: (m) => m.whatsapp ? (
        <a
          href={`https://wa.me/${m.whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline text-sm"
          onClick={(e) => e.stopPropagation()}
        >
          {m.whatsapp}
        </a>
      ) : (
        <span className="text-muted-foreground text-sm">Pendiente</span>
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
      key: 'acceso',
      label: 'Estado',
      render: (m) => {
        if (!m.active) {
          return <StatusChip label="Desactivado" colorClass="bg-destructive/15 text-destructive" size="sm" />
        }
        if (!m.whatsapp) {
          return <StatusChip label="Invitado" colorClass="bg-warning/15 text-warning" size="sm" />
        }
        return <StatusChip label="Activo" colorClass="bg-success/15 text-success" size="sm" />
      },
    },
  ]

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setInviteOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invitar miembro
        </Button>
      </div>

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
              {member.email && !member.whatsapp && member.active && (
                <DropdownMenuItem
                  onClick={() => handleResendInvite(member)}
                  disabled={actionLoading}
                >
                  <MailPlus className="mr-2 h-4 w-4" />
                  Reenviar invitación
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {member.active ? (
                <DropdownMenuItem
                  onClick={() => setDeactivatingMember(member)}
                  className="text-destructive focus:text-destructive"
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Desactivar usuario
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={() => handleReactivate(member)}
                  disabled={actionLoading}
                >
                  <UserCheck className="mr-2 h-4 w-4" />
                  Reactivar usuario
                </DropdownMenuItem>
              )}
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

      <InviteMemberModal
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onLinkGenerated={handleLinkGenerated}
      />

      <ConfirmModal
        open={!!deactivatingMember}
        onOpenChange={(open) => !open && setDeactivatingMember(null)}
        title="Desactivar usuario"
        description={`¿Estás seguro de que querés desactivar a ${deactivatingMember?.full_name}? El usuario no podrá acceder al sistema, pero sus datos (ventas, comisiones, pagos) se mantienen intactos.`}
        confirmLabel="Desactivar"
        variant="destructive"
        onConfirm={handleDeactivate}
        loading={actionLoading}
      />

      <Dialog open={!!magicLink} onOpenChange={(open) => { if (!open) { setMagicLink(null); setCopied(false) } }}>
        <DialogContent className="bg-surface-2 border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Enlace de invitación</DialogTitle>
            <DialogDescription>
              Copiá este enlace y compartilo con el miembro del equipo por WhatsApp u otro medio.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input value={magicLink ?? ''} readOnly className="text-xs font-mono" />
            <Button onClick={copyLink} variant="outline" size="icon" className="shrink-0">
              {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
