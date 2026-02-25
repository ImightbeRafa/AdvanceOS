'use client'

import type { Profile, UserRole } from '@/types'
import { QuickViewDrawer } from '@/components/shared/quick-view-drawer'
import { StatusChip } from '@/components/shared/status-chip'
import { ROLE_LABELS, ROLE_COLORS } from '@/lib/constants'
import { formatUSD } from '@/lib/utils/currency'
import { Separator } from '@/components/ui/separator'

interface TeamMemberDrawerProps {
  member: Profile | null
  open: boolean
  onOpenChange: (open: boolean) => void
  userRole?: UserRole
}

export function TeamMemberDrawer({ member, open, onOpenChange, userRole }: TeamMemberDrawerProps) {
  if (!member) return null

  return (
    <QuickViewDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={member.full_name}
      description={ROLE_LABELS[member.role]}
    >
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Rol</span>
            <StatusChip label={ROLE_LABELS[member.role]} colorClass={ROLE_COLORS[member.role]} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Estado</span>
            <StatusChip
              label={member.active ? 'Activo' : 'Inactivo'}
              colorClass={member.active ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}
            />
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium">Contacto</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Email</span>
              <span className="text-sm">{member.email ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">WhatsApp</span>
              <a
                href={`https://wa.me/${member.whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                {member.whatsapp}
              </a>
            </div>
          </div>
        </div>

        <Separator />

        <div className="space-y-3">
          <h4 className="text-sm font-medium">Planilla</h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Salario</span>
              <span className="text-sm font-medium">
                {member.salary ? formatUSD(member.salary) : '—'}
              </span>
            </div>
            {member.salary_notes && (
              <div>
                <span className="text-sm text-muted-foreground">Notas salario</span>
                <p className="mt-1 text-sm">{member.salary_notes}</p>
              </div>
            )}
          </div>
        </div>

        {member.bac_account_encrypted && userRole === 'admin' && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Datos bancarios</h4>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Cuenta BAC (USD)</span>
                <span className="text-sm font-mono">{member.bac_account_encrypted}</span>
              </div>
            </div>
          </>
        )}

        {member.admin_notes && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Notas internas</h4>
              <p className="text-sm text-muted-foreground">{member.admin_notes}</p>
            </div>
          </>
        )}
      </div>
    </QuickViewDrawer>
  )
}
