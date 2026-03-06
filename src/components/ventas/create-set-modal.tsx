'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createSetSchema, type CreateSetFormData } from '@/lib/schemas'
import { createSet, checkDuplicateIG } from '@/lib/actions/sets'
import type { Profile } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Sparkles, Loader2, ClipboardPaste } from 'lucide-react'

interface CreateSetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  closers: Pick<Profile, 'id' | 'full_name'>[]
}

export function CreateSetModal({ open, onOpenChange, closers }: CreateSetModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [activeTab, setActiveTab] = useState('manual')
  const [duplicates, setDuplicates] = useState<{ id: string; prospect_name: string; status: string }[]>([])
  const [serviceKey, setServiceKey] = useState(0)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<CreateSetFormData>({
    resolver: zodResolver(createSetSchema),
  })

  const igValue = watch('prospect_ig')

  async function handleIGBlur() {
    if (!igValue || igValue.length < 2) return
    const results = await checkDuplicateIG(igValue)
    setDuplicates(results)
  }

  async function handleAIParse() {
    if (!pasteText.trim() || pasteText.trim().length < 10) {
      toast.error('Pegá al menos un párrafo con información del prospecto')
      return
    }

    setParsing(true)
    try {
      const res = await fetch('/api/parse-set-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: pasteText }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al analizar')
      }

      const parsed = await res.json()

      if (parsed.prospect_name) setValue('prospect_name', parsed.prospect_name)
      if (parsed.prospect_whatsapp) setValue('prospect_whatsapp', parsed.prospect_whatsapp)
      if (parsed.prospect_ig) setValue('prospect_ig', parsed.prospect_ig)
      if (parsed.prospect_web) setValue('prospect_web', parsed.prospect_web)
      if (parsed.summary) setValue('summary', parsed.summary)
      if (parsed.service_offered === 'advance90' || parsed.service_offered === 'meta_advance') {
        setValue('service_offered', parsed.service_offered)
        setServiceKey((k) => k + 1)
      }

      toast.success('Información extraída — revisá y completá los campos faltantes')
      setActiveTab('manual')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al analizar el texto')
    } finally {
      setParsing(false)
    }
  }

  async function onSubmit(data: CreateSetFormData) {
    setLoading(true)
    try {
      await createSet(data)
      toast.success('Set creado exitosamente')
      reset()
      setDuplicates([])
      setPasteText('')
      setActiveTab('manual')
      onOpenChange(false)
      router.refresh()
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al crear el set')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-surface-2 border-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Crear set</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full">
            <TabsTrigger value="manual" className="flex-1">Manual</TabsTrigger>
            <TabsTrigger value="paste" className="flex-1 gap-1.5">
              <ClipboardPaste className="h-3.5 w-3.5" />
              Pegar texto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paste">
            <div className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Información del prospecto</Label>
                <Textarea
                  placeholder="Pegá aquí la información del prospecto (nombre, negocio, situación, redes, etc.)"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={8}
                  className="resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  La IA analizará el texto y llenará el formulario automáticamente.
                </p>
              </div>
              <Button
                type="button"
                onClick={handleAIParse}
                disabled={parsing || pasteText.trim().length < 10}
                className="w-full gap-2"
              >
                {parsing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analizando...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Analizar con IA
                  </>
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="manual">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label>Nombre del prospecto <span className="text-destructive">*</span></Label>
                <Input placeholder="Nombre del negocio o persona" {...register('prospect_name')} />
                {errors.prospect_name && <p className="text-xs text-destructive">{errors.prospect_name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>WhatsApp</Label>
                <Input placeholder="+506 8888 8888" {...register('prospect_whatsapp')} />
                {errors.prospect_whatsapp && <p className="text-xs text-destructive">{errors.prospect_whatsapp.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Instagram del negocio <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="@negocio"
                  {...register('prospect_ig')}
                  onBlur={handleIGBlur}
                />
                {errors.prospect_ig && <p className="text-xs text-destructive">{errors.prospect_ig.message}</p>}
                {duplicates.length > 0 && (
                  <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 space-y-1">
                    <div className="flex items-center gap-1.5 text-warning text-sm font-medium">
                      <AlertTriangle className="h-4 w-4" />
                      IG duplicado encontrado
                    </div>
                    {duplicates.map((d) => (
                      <p key={d.id} className="text-xs text-muted-foreground">
                        {d.prospect_name} — {d.status}
                      </p>
                    ))}
                    <p className="text-xs text-muted-foreground">
                      Podés continuar creando el set (quedará marcado como duplicado).
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Web</Label>
                <Input placeholder="https://..." {...register('prospect_web')} />
                {errors.prospect_web && <p className="text-xs text-destructive">{errors.prospect_web.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Closer asignado <span className="text-destructive">*</span></Label>
                <Select onValueChange={(v) => setValue('closer_id', v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar closer" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-3">
                    {closers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.closer_id && <p className="text-xs text-destructive">{errors.closer_id.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Fecha y hora agendada</Label>
                <Input type="datetime-local" {...register('scheduled_at')} />
                {errors.scheduled_at && <p className="text-xs text-destructive">{errors.scheduled_at.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Servicio ofrecido <span className="text-destructive">*</span></Label>
                <Select key={serviceKey} onValueChange={(v) => setValue('service_offered', v as 'advance90' | 'meta_advance')} value={watch('service_offered') || undefined}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar servicio" />
                  </SelectTrigger>
                  <SelectContent className="bg-surface-3">
                    <SelectItem value="advance90">Advance90</SelectItem>
                    <SelectItem value="meta_advance">Meta Advance</SelectItem>
                  </SelectContent>
                </Select>
                {errors.service_offered && <p className="text-xs text-destructive">{errors.service_offered.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Resumen de situación <span className="text-destructive">*</span></Label>
                <Textarea
                  placeholder="Describí brevemente la situación del prospecto"
                  {...register('summary')}
                  rows={3}
                />
                {errors.summary && <p className="text-xs text-destructive">{errors.summary.message}</p>}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creando...' : 'Crear set'}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
