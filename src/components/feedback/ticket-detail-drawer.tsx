'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { feedbackReplySchema, type FeedbackReplyFormData } from '@/lib/schemas'
import {
  getTicketById,
  updateTicketStatus,
  updateTicketAssignment,
  updateTicketAdminNotes,
  replyToTicket,
} from '@/lib/actions/feedback'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StatusChip } from '@/components/shared/status-chip'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { Lock, Send, MapPin, Monitor, ArrowRight } from 'lucide-react'
import {
  FEEDBACK_STATUS_LABELS,
  FEEDBACK_STATUS_COLORS,
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_CATEGORY_COLORS,
  FEEDBACK_PRIORITY_LABELS,
  FEEDBACK_PRIORITY_COLORS,
} from '@/lib/constants'
import type { FeedbackTicket, FeedbackReply, FeedbackStatus, Profile } from '@/types'

interface TicketDetailDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  ticket: FeedbackTicket | null
  teamMembers: Pick<Profile, 'id' | 'full_name' | 'role'>[]
}

export function TicketDetailDrawer({ open, onOpenChange, ticket, teamMembers }: TicketDetailDrawerProps) {
  const router = useRouter()
  const [fullTicket, setFullTicket] = useState<(FeedbackTicket & { replies: FeedbackReply[] }) | null>(null)
  const [loadingStatus, setLoadingStatus] = useState(false)
  const [loadingAssign, setLoadingAssign] = useState(false)
  const [loadingNotes, setLoadingNotes] = useState(false)
  const [loadingReply, setLoadingReply] = useState(false)
  const [adminNotes, setAdminNotes] = useState('')

  const { register, handleSubmit, setValue, reset, watch, formState: { errors } } = useForm<FeedbackReplyFormData>({
    resolver: zodResolver(feedbackReplySchema),
    defaultValues: { message: '', is_internal: false },
  })

  const isInternal = watch('is_internal')

  const loadTicket = useCallback(async () => {
    if (!ticket) return
    const data = await getTicketById(ticket.id)
    if (data) {
      setFullTicket(data as FeedbackTicket & { replies: FeedbackReply[] })
      setAdminNotes(data.admin_notes ?? '')
    }
  }, [ticket])

  useEffect(() => {
    if (open && ticket) {
      loadTicket()
    } else {
      setFullTicket(null)
      setAdminNotes('')
      reset()
    }
  }, [open, ticket, loadTicket, reset])

  async function handleStatusChange(status: FeedbackStatus) {
    if (!ticket) return
    setLoadingStatus(true)
    try {
      await updateTicketStatus(ticket.id, status)
      toast.success('Estado actualizado')
      await loadTicket()
      router.refresh()
    } catch {
      toast.error('Error al actualizar estado')
    } finally {
      setLoadingStatus(false)
    }
  }

  async function handleAssignmentChange(assignedTo: string) {
    if (!ticket) return
    setLoadingAssign(true)
    try {
      await updateTicketAssignment(ticket.id, assignedTo === 'none' ? null : assignedTo)
      toast.success('Asignación actualizada')
      await loadTicket()
      router.refresh()
    } catch {
      toast.error('Error al asignar')
    } finally {
      setLoadingAssign(false)
    }
  }

  async function handleSaveNotes() {
    if (!ticket) return
    setLoadingNotes(true)
    try {
      await updateTicketAdminNotes(ticket.id, adminNotes)
      toast.success('Notas guardadas')
    } catch {
      toast.error('Error al guardar notas')
    } finally {
      setLoadingNotes(false)
    }
  }

  async function onSubmitReply(data: FeedbackReplyFormData) {
    if (!ticket) return
    setLoadingReply(true)
    try {
      await replyToTicket(ticket.id, data)
      toast.success('Respuesta enviada')
      reset()
      await loadTicket()
      router.refresh()
    } catch {
      toast.error('Error al enviar respuesta')
    } finally {
      setLoadingReply(false)
    }
  }

  const displayTicket = fullTicket ?? ticket

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-xl bg-surface-2 border-border">
        <SheetHeader>
          <SheetTitle className="text-left">{displayTicket?.subject ?? 'Ticket'}</SheetTitle>
          <SheetDescription className="text-left">
            {displayTicket?.user?.full_name} &middot;{' '}
            {displayTicket ? format(new Date(displayTicket.created_at), "dd MMM yyyy 'a las' HH:mm", { locale: es }) : ''}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] pr-4 mt-4">
          {displayTicket && (
            <div className="space-y-6">
              {/* Metadata badges */}
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip
                  label={FEEDBACK_CATEGORY_LABELS[displayTicket.category]}
                  colorClass={FEEDBACK_CATEGORY_COLORS[displayTicket.category]}
                />
                <StatusChip
                  label={FEEDBACK_PRIORITY_LABELS[displayTicket.priority]}
                  colorClass={FEEDBACK_PRIORITY_COLORS[displayTicket.priority]}
                />
                <StatusChip
                  label={FEEDBACK_STATUS_LABELS[displayTicket.status]}
                  colorClass={FEEDBACK_STATUS_COLORS[displayTicket.status]}
                />
              </div>

              {/* Description */}
              <div className="rounded-lg border border-border bg-surface-1 p-4">
                <p className="text-sm whitespace-pre-wrap">{displayTicket.description}</p>
              </div>

              {/* Context metadata */}
              {displayTicket.metadata && displayTicket.metadata.page_url && (
                <div className="rounded-lg border border-border bg-surface-1 p-3 space-y-2">
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Contexto capturado</p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">Página:</span>
                      <code className="text-foreground bg-surface-2 px-1.5 py-0.5 rounded text-[11px]">
                        {displayTicket.metadata.page_url}
                      </code>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Monitor className="h-3 w-3 text-muted-foreground shrink-0" />
                      <span className="text-muted-foreground">
                        {displayTicket.metadata.browser} &middot; {displayTicket.metadata.screen}
                      </span>
                    </div>
                    {displayTicket.metadata.nav_trail.length > 0 && (
                      <div className="pt-1">
                        <span className="text-muted-foreground flex items-center gap-1 mb-1">
                          <ArrowRight className="h-3 w-3" /> Recorrido reciente:
                        </span>
                        <div className="flex flex-wrap items-center gap-1">
                          {displayTicket.metadata.nav_trail.map((path, i) => (
                            <span key={i} className="inline-flex items-center">
                              <code className="bg-surface-2 px-1.5 py-0.5 rounded text-[11px] text-muted-foreground">{path}</code>
                              {i < displayTicket.metadata!.nav_trail.length - 1 && (
                                <ArrowRight className="h-2.5 w-2.5 mx-0.5 text-muted-foreground/50" />
                              )}
                            </span>
                          ))}
                          <ArrowRight className="h-2.5 w-2.5 mx-0.5 text-muted-foreground/50" />
                          <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[11px] font-medium">
                            {displayTicket.metadata.page_url}
                          </code>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Separator />

              {/* Admin controls */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Estado</Label>
                  <Select
                    value={displayTicket.status}
                    onValueChange={(v) => handleStatusChange(v as FeedbackStatus)}
                    disabled={loadingStatus}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-surface-3">
                      {(Object.entries(FEEDBACK_STATUS_LABELS) as [FeedbackStatus, string][]).map(([value, label]) => (
                        <SelectItem key={value} value={value}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Asignado a</Label>
                  <Select
                    value={displayTicket.assigned_to ?? 'none'}
                    onValueChange={handleAssignmentChange}
                    disabled={loadingAssign}
                  >
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-surface-3">
                      <SelectItem value="none">Sin asignar</SelectItem>
                      {teamMembers.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Admin notes */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Notas internas (solo admin)</Label>
                <Textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Notas internas sobre este ticket..."
                  rows={2}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveNotes}
                  disabled={loadingNotes}
                >
                  {loadingNotes ? 'Guardando...' : 'Guardar notas'}
                </Button>
              </div>

              <Separator />

              {/* Reply thread */}
              <div className="space-y-3">
                <Label className="text-xs text-muted-foreground">Conversación</Label>

                {fullTicket?.replies && fullTicket.replies.length > 0 ? (
                  <div className="space-y-3">
                    {fullTicket.replies.map((reply) => (
                      <div
                        key={reply.id}
                        className={`rounded-lg border p-3 ${
                          reply.is_internal
                            ? 'border-warning/30 bg-warning/5'
                            : 'border-border bg-surface-1'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <Avatar className="h-5 w-5">
                            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                              {reply.user?.full_name?.charAt(0)?.toUpperCase() ?? '?'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium">
                            {reply.user?.full_name ?? 'Usuario'}
                          </span>
                          {reply.is_internal && (
                            <span className="flex items-center gap-0.5 text-[10px] text-warning font-medium">
                              <Lock className="h-2.5 w-2.5" />
                              Interna
                            </span>
                          )}
                          <span className="text-[10px] text-muted-foreground ml-auto">
                            {format(new Date(reply.created_at), "dd MMM, HH:mm", { locale: es })}
                          </span>
                        </div>
                        <p className="text-sm whitespace-pre-wrap">{reply.message}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Sin respuestas aún.</p>
                )}
              </div>

              <Separator />

              {/* Reply form */}
              <form onSubmit={handleSubmit(onSubmitReply)} className="space-y-3">
                <Textarea
                  {...register('message')}
                  placeholder="Escribí tu respuesta..."
                  rows={3}
                />
                {errors.message && <p className="text-xs text-destructive">{errors.message.message}</p>}

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="is_internal"
                      checked={isInternal}
                      onCheckedChange={(checked) => setValue('is_internal', !!checked)}
                    />
                    <Label htmlFor="is_internal" className="text-xs text-muted-foreground">
                      Nota interna (no visible para el usuario)
                    </Label>
                  </div>

                  <Button type="submit" size="sm" disabled={loadingReply}>
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    {loadingReply ? 'Enviando...' : 'Responder'}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
