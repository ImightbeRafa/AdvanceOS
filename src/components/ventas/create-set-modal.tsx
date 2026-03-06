'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
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
import { AlertTriangle, Sparkles, Loader2, ImagePlus, X, Camera } from 'lucide-react'

const MAX_IMAGES = 5
const MAX_IMAGE_SIZE = 20 * 1024 * 1024 // 20 MiB
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png']

interface CreateSetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  closers: Pick<Profile, 'id' | 'full_name'>[]
}

const COMPRESS_MAX_DIM = 1600
const COMPRESS_QUALITY = 0.85
const IG_SKIP = ['', 'n/a', 'na', 'no', 'none', '-', 'sin', 'no tiene']

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      let { width, height } = img
      // Scale down if larger than max dimension
      if (width > COMPRESS_MAX_DIM || height > COMPRESS_MAX_DIM) {
        const ratio = Math.min(COMPRESS_MAX_DIM / width, COMPRESS_MAX_DIM / height)
        width = Math.round(width * ratio)
        height = Math.round(height * ratio)
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }
      ctx.drawImage(img, 0, 0, width, height)
      const dataUrl = canvas.toDataURL('image/jpeg', COMPRESS_QUALITY)
      resolve(dataUrl)
    }
    img.onerror = () => reject(new Error('Error al cargar imagen'))
    img.src = URL.createObjectURL(file)
  })
}

export function CreateSetModal({ open, onOpenChange, closers }: CreateSetModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [images, setImages] = useState<{ file: File; preview: string }[]>([])
  const [activeTab, setActiveTab] = useState('manual')
  const [duplicates, setDuplicates] = useState<{ id: string; prospect_name: string; status: string }[]>([])
  const [dragOver, setDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { register, handleSubmit, setValue, watch, reset, control, formState: { errors } } = useForm<CreateSetFormData>({
    resolver: zodResolver(createSetSchema),
  })

  const igValue = watch('prospect_ig')

  useEffect(() => {
    if (closers.length === 1) {
      setValue('closer_id', closers[0].id, { shouldValidate: true })
    }
  }, [closers, setValue])

  async function handleIGBlur() {
    if (!igValue || igValue.length < 2) { setDuplicates([]); return }
    const clean = igValue.toLowerCase().replace('@', '').trim()
    if (IG_SKIP.includes(clean)) { setDuplicates([]); return }
    const results = await checkDuplicateIG(igValue)
    setDuplicates(results)
  }

  const addImages = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files)
    const valid: { file: File; preview: string }[] = []

    for (const file of fileArray) {
      if (!ACCEPTED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: solo se aceptan JPG y PNG`)
        continue
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error(`${file.name}: máximo 20 MB por imagen`)
        continue
      }
      valid.push({ file, preview: URL.createObjectURL(file) })
    }

    setImages((prev) => {
      const combined = [...prev, ...valid]
      if (combined.length > MAX_IMAGES) {
        toast.error(`Máximo ${MAX_IMAGES} imágenes`)
        return combined.slice(0, MAX_IMAGES)
      }
      return combined
    })
  }, [])

  const removeImage = useCallback((index: number) => {
    setImages((prev) => {
      const updated = [...prev]
      URL.revokeObjectURL(updated[index].preview)
      updated.splice(index, 1)
      return updated
    })
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files.length > 0) {
      addImages(e.dataTransfer.files)
    }
  }, [addImages])

  async function handleAIParse() {
    const hasText = pasteText.trim().length >= 10
    const hasImages = images.length > 0

    if (!hasText && !hasImages) {
      toast.error('Subí capturas de pantalla o pegá texto con información del prospecto')
      return
    }

    setParsing(true)
    try {
      // Convert images to base64
      const imageBase64: string[] = []
      if (hasImages) {
        for (const img of images) {
          const b64 = await compressImage(img.file)
          imageBase64.push(b64)
        }
      }

      const res = await fetch('/api/parse-set-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: hasText ? pasteText : undefined,
          images: imageBase64.length > 0 ? imageBase64 : undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al analizar')
      }

      const parsed = await res.json()

      let closerId: string | undefined
      if (parsed.closer_name && closers.length > 0) {
        const normalise = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim()
        const target = normalise(parsed.closer_name)
        const match = closers.find((c) => normalise(c.full_name) === target)
          || closers.find((c) => normalise(c.full_name).includes(target) || target.includes(normalise(c.full_name)))
        if (match) closerId = match.id
      }
      if (!closerId && closers.length === 1) closerId = closers[0].id

      if (parsed.prospect_name) setValue('prospect_name', parsed.prospect_name, { shouldValidate: true })
      if (parsed.prospect_whatsapp) setValue('prospect_whatsapp', parsed.prospect_whatsapp, { shouldValidate: true })
      if (parsed.prospect_ig) setValue('prospect_ig', parsed.prospect_ig, { shouldValidate: true })
      if (parsed.prospect_web) setValue('prospect_web', parsed.prospect_web, { shouldValidate: true })
      if (parsed.summary) setValue('summary', parsed.summary, { shouldValidate: true })
      if (parsed.service_offered === 'advance90' || parsed.service_offered === 'meta_advance') {
        setValue('service_offered', parsed.service_offered, { shouldValidate: true })
      }
      if (closerId) {
        setValue('closer_id', closerId, { shouldValidate: true })
      }

      if (parsed.ig_missing) {
        toast.warning('Instagram no detectado — completalo manualmente en el formulario')
      }

      toast.success('Información extraída — revisá y completá los campos faltantes')
      setActiveTab('manual')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al analizar')
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
      setImages([])
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
              <Camera className="h-3.5 w-3.5" />
              IA
            </TabsTrigger>
          </TabsList>

          <TabsContent value="paste">
            <div className="space-y-4 pt-2">
              {/* Image upload area */}
              <div className="space-y-2">
                <Label>Capturas de la conversación</Label>
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-6 cursor-pointer transition-colors ${
                    dragOver
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <ImagePlus className="h-8 w-8 text-muted-foreground" />
                  <div className="text-center">
                    <p className="text-sm font-medium text-muted-foreground">
                      Arrastrá capturas aquí o hacé clic
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      JPG o PNG · máx. 20 MB · hasta {MAX_IMAGES} imágenes
                    </p>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files) addImages(e.target.files)
                      e.target.value = ''
                    }}
                  />
                </div>

                {/* Image thumbnails */}
                {images.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {images.map((img, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={img.preview}
                          alt={`Captura ${i + 1}`}
                          className="h-16 w-16 rounded-lg object-cover border border-border"
                        />
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImage(i) }}
                          className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Optional text context */}
              <div className="space-y-2">
                <Label>Contexto adicional <span className="text-xs text-muted-foreground">(opcional)</span></Label>
                <Textarea
                  placeholder="Información extra que no esté en las capturas (nombre, IG, etc.)"
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  rows={3}
                  className="resize-y"
                />
              </div>

              <Button
                type="button"
                onClick={handleAIParse}
                disabled={parsing || (pasteText.trim().length < 10 && images.length === 0)}
                className="w-full gap-2"
              >
                {parsing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Analizando{images.length > 0 ? ` ${images.length} imagen${images.length > 1 ? 'es' : ''}` : ''}...
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
            <div />  {/* placeholder so Radix doesn't complain */}
          </TabsContent>
        </Tabs>

        <form onSubmit={handleSubmit(onSubmit)} className={`space-y-4 pt-2 ${activeTab !== 'manual' ? 'hidden' : ''}`}>
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
                <Label>Instagram del negocio</Label>
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
                <Controller
                  name="closer_id"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar closer" />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-3">
                        {closers.map((c) => (
                          <SelectItem key={c.id} value={c.id}>{c.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.closer_id && <p className="text-xs text-destructive">{errors.closer_id.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Fecha y hora agendada</Label>
                <Input type="datetime-local" {...register('scheduled_at')} />
                {errors.scheduled_at && <p className="text-xs text-destructive">{errors.scheduled_at.message}</p>}
              </div>

              <div className="space-y-2">
                <Label>Servicio ofrecido <span className="text-destructive">*</span></Label>
                <Controller
                  name="service_offered"
                  control={control}
                  render={({ field }) => (
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar servicio" />
                      </SelectTrigger>
                      <SelectContent className="bg-surface-3">
                        <SelectItem value="advance90">Advance90</SelectItem>
                        <SelectItem value="meta_advance">Meta Advance</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
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
      </DialogContent>
    </Dialog>
  )
}
