'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { feedbackTicketSchema, type FeedbackTicketFormData } from '@/lib/schemas'
import { createTicket } from '@/lib/actions/feedback'
import { useFeedbackContext } from '@/lib/hooks/use-feedback-context'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { MessageSquarePlus, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import {
  FEEDBACK_CATEGORY_LABELS,
  FEEDBACK_PRIORITY_LABELS,
} from '@/lib/constants'
import type { FeedbackCategory, FeedbackContext, FeedbackPriority } from '@/types'

export function FeedbackWidget() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const { captureContext } = useFeedbackContext()
  const snapshotRef = useRef<FeedbackContext | null>(null)

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FeedbackTicketFormData>({
    resolver: zodResolver(feedbackTicketSchema),
    defaultValues: {
      priority: 'media',
    },
  })

  async function onSubmit(data: FeedbackTicketFormData) {
    setLoading(true)
    try {
      await createTicket(data, snapshotRef.current ?? undefined)
      toast.success('Ticket enviado correctamente')
      reset()
      snapshotRef.current = null
      setOpen(false)
      router.refresh()
    } catch {
      toast.error('Error al enviar ticket')
    } finally {
      setLoading(false)
    }
  }

  function handleOpen() {
    snapshotRef.current = captureContext()
    setOpen(true)
  }

  function handleOpenChange(value: boolean) {
    setOpen(value)
    if (!value) {
      reset()
      snapshotRef.current = null
    }
  }

  return (
    <>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full shadow-lg"
            onClick={handleOpen}
          >
            <MessageSquarePlus className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="left">Enviar feedback</TooltipContent>
      </Tooltip>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="bg-surface-2 border-border max-w-md">
          <DialogHeader>
            <DialogTitle>Enviar feedback</DialogTitle>
            <DialogDescription>
              Reportá un problema, enviá una sugerencia o hacé una pregunta.
            </DialogDescription>
          </DialogHeader>

          {snapshotRef.current && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-surface-1 rounded-md px-2.5 py-1.5">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">
                Página: <span className="text-foreground font-medium">{snapshotRef.current.page_url}</span>
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoría <span className="text-destructive">*</span></Label>
                <Select onValueChange={(v) => setValue('category', v as FeedbackCategory)}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent className="bg-surface-3">
                    {(Object.entries(FEEDBACK_CATEGORY_LABELS) as [FeedbackCategory, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-xs text-destructive">{errors.category.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Prioridad <span className="text-destructive">*</span></Label>
                <Select defaultValue="media" onValueChange={(v) => setValue('priority', v as FeedbackPriority)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent className="bg-surface-3">
                    {(Object.entries(FEEDBACK_PRIORITY_LABELS) as [FeedbackPriority, string][]).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.priority && <p className="text-xs text-destructive">{errors.priority.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Asunto <span className="text-destructive">*</span></Label>
              <Input {...register('subject')} placeholder="Describí brevemente el tema" />
              {errors.subject && <p className="text-xs text-destructive">{errors.subject.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Descripción <span className="text-destructive">*</span></Label>
              <Textarea
                {...register('description')}
                placeholder="Detallá tu feedback..."
                rows={4}
              />
              {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Enviando...' : 'Enviar ticket'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
