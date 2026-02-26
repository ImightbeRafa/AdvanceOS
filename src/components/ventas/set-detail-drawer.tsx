'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { Set, Profile } from '@/types'
import { QuickViewDrawer } from '@/components/shared/quick-view-drawer'
import { StatusChip } from '@/components/shared/status-chip'
import {
  SET_STATUS_LABELS,
  SET_STATUS_COLORS,
  SERVICE_LABELS,
  PAYMENT_METHOD_LABELS,
} from '@/lib/constants'
import { formatDateTime } from '@/lib/utils/dates'
import { formatUSD } from '@/lib/utils/currency'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { updateSetStatus } from '@/lib/actions/sets'
import { toast } from 'sonner'
import dynamic from 'next/dynamic'
import { ExternalLink, MessageCircle } from 'lucide-react'

const DealModal = dynamic<{ set: Set; open: boolean; onOpenChange: (open: boolean) => void }>(
  () => import('./deal-modal').then(m => ({ default: m.DealModal }))
)
const PaymentModal = dynamic<{ set: Set; clientId: string | null; open: boolean; onOpenChange: (open: boolean) => void }>(
  () => import('./payment-modal').then(m => ({ default: m.PaymentModal }))
)

interface SetDetailDrawerProps {
  set: Set | null
  open: boolean
  onOpenChange: (open: boolean) => void
  closers: Pick<Profile, 'id' | 'full_name'>[]
}

export function SetDetailDrawer({ set, open, onOpenChange, closers }: SetDetailDrawerProps) {
  const router = useRouter()
  const [showDealModal, setShowDealModal] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)

  if (!set) return null

  const setter = set.setter as unknown as Profile | undefined
  const closer = set.closer as unknown as Profile | undefined
  const deal = Array.isArray(set.deal) ? set.deal[0] : set.deal

  async function quickStatusUpdate(status: string) {
    setActionLoading(true)
    try {
      await updateSetStatus(set!.id, status as import('@/types').SetStatus)
      toast.success(`Estado actualizado a "${SET_STATUS_LABELS[status as keyof typeof SET_STATUS_LABELS]}"`)
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al actualizar')
    } finally {
      setActionLoading(false)
    }
  }

  return (
    <>
      <QuickViewDrawer
        open={open}
        onOpenChange={onOpenChange}
        title={set.prospect_name}
        description={SERVICE_LABELS[set.service_offered]}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <StatusChip
              label={SET_STATUS_LABELS[set.status]}
              colorClass={SET_STATUS_COLORS[set.status]}
              size="md"
            />
            {set.is_duplicate && (
              <StatusChip label="Duplicado" colorClass="bg-warning/15 text-warning" />
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Prospecto</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">WhatsApp</span>
              <a
                href={`https://wa.me/${set.prospect_whatsapp.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                <MessageCircle className="h-3 w-3" />
                {set.prospect_whatsapp}
              </a>

              <span className="text-muted-foreground">Instagram</span>
              <a
                href={`https://instagram.com/${set.prospect_ig}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />
                @{set.prospect_ig}
              </a>

              {set.prospect_web && (
                <>
                  <span className="text-muted-foreground">Web</span>
                  <a
                    href={set.prospect_web}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline truncate"
                  >
                    {set.prospect_web}
                  </a>
                </>
              )}
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Asignación</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Setter</span>
              <span>{setter?.full_name ?? '—'}</span>
              <span className="text-muted-foreground">Closer</span>
              <span>{closer?.full_name ?? '—'}</span>
              <span className="text-muted-foreground">Fecha llamada</span>
              <span>{formatDateTime(set.scheduled_at)}</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Resumen</h4>
            <p className="text-sm text-muted-foreground">{set.summary}</p>
          </div>

          {deal && (
            <>
              <Separator />
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Deal</h4>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {deal.revenue_total && (
                    <>
                      <span className="text-muted-foreground">Revenue total</span>
                      <span className="font-medium">{formatUSD(deal.revenue_total)}</span>
                    </>
                  )}
                  {deal.service_sold && (
                    <>
                      <span className="text-muted-foreground">Servicio vendido</span>
                      <span>{SERVICE_LABELS[deal.service_sold as keyof typeof SERVICE_LABELS]}</span>
                    </>
                  )}
                  {deal.phantom_link && (
                    <>
                      <span className="text-muted-foreground">Phantom</span>
                      <a
                        href={deal.phantom_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate"
                      >
                        Ver grabación
                      </a>
                    </>
                  )}
                  {deal.closer_notes && (
                    <>
                      <span className="text-muted-foreground">Notas</span>
                      <span>{deal.closer_notes}</span>
                    </>
                  )}
                </div>
              </div>

              {set.status === 'closed_pendiente' && deal.revenue_total && (
                <>
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-2">
                    <h4 className="text-sm font-medium text-warning">Saldo pendiente</h4>
                    {(() => {
                      const payments = set.payments ?? []
                      const totalPaid = payments.reduce((sum, p) => sum + (p.amount_gross ?? 0), 0)
                      const totalNet = payments.reduce((sum, p) => sum + (p.amount_net ?? 0), 0)
                      const remaining = deal.revenue_total! - totalPaid
                      return (
                        <div className="grid grid-cols-2 gap-1 text-sm">
                          <span className="text-muted-foreground">Revenue pactado</span>
                          <span className="font-medium">{formatUSD(deal.revenue_total!)}</span>
                          <span className="text-muted-foreground">Total cobrado</span>
                          <span>{formatUSD(totalPaid)}</span>
                          <span className="text-muted-foreground">Total neto recibido</span>
                          <span>{formatUSD(totalNet)}</span>
                          <span className="text-muted-foreground font-medium">Saldo restante</span>
                          <span className="font-bold text-warning">{formatUSD(remaining > 0 ? remaining : 0)}</span>
                          <span className="text-muted-foreground">Pagos registrados</span>
                          <span>{payments.length}</span>
                        </div>
                      )
                    })()}
                  </div>
                </>
              )}
            </>
          )}

          <Separator />

          <div className="space-y-2">
            <h4 className="text-sm font-medium">Acciones</h4>
            <div className="flex flex-wrap gap-2">
              {set.status === 'agendado' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => quickStatusUpdate('precall_enviado')}
                  disabled={actionLoading}
                >
                  Marcar pre-call enviado
                </Button>
              )}
              {['agendado', 'precall_enviado', 'reagendo'].includes(set.status) && (
                <>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => quickStatusUpdate('reagendo')}
                    disabled={actionLoading || set.status === 'reagendo'}
                  >
                    Reagendar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => quickStatusUpdate('no_show')}
                    disabled={actionLoading}
                  >
                    No show
                  </Button>
                </>
              )}
              {!['closed', 'descalificado'].includes(set.status) && (
                <Button
                  size="sm"
                  onClick={() => setShowDealModal(true)}
                  disabled={actionLoading}
                >
                  Crear deal
                </Button>
              )}
              {set.status === 'closed_pendiente' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowPaymentModal(true)}
                >
                  Registrar pago
                </Button>
              )}
            </div>
          </div>
        </div>
      </QuickViewDrawer>

      <DealModal
        set={set}
        open={showDealModal}
        onOpenChange={setShowDealModal}
      />

      {set.status === 'closed_pendiente' && deal && (
        <PaymentModal
          set={set}
          clientId={null}
          open={showPaymentModal}
          onOpenChange={setShowPaymentModal}
        />
      )}
    </>
  )
}
