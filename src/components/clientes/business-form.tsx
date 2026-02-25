'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { saveClientForm } from '@/lib/actions/clients'
import { toast } from 'sonner'
import { Plus, Trash2, Save, CheckCircle } from 'lucide-react'
import type { BusinessType, ClientForm } from '@/types'

interface FormField {
  key: string
  label: string
  type: 'text' | 'textarea' | 'url' | 'number' | 'select' | 'file'
  required?: boolean
  placeholder?: string
  options?: string[]
}

interface RepeatableSection {
  key: string
  label: string
  maxItems: number
  fields: FormField[]
}

interface FormSection {
  title: string
  fields: FormField[]
  repeatables?: RepeatableSection[]
}

const FORM_SCHEMAS: Record<string, FormSection[]> = {
  producto: [
    {
      title: 'Información del negocio',
      fields: [
        { key: 'business_description', label: 'Descripción del negocio', type: 'textarea', required: true, placeholder: 'Describí tu negocio...' },
        { key: 'target_audience', label: 'Público objetivo', type: 'textarea', required: true },
        { key: 'unique_value', label: 'Propuesta de valor única', type: 'textarea', required: true },
        { key: 'website', label: 'Sitio web', type: 'url', placeholder: 'https://...' },
      ],
    },
    {
      title: 'Productos',
      fields: [],
      repeatables: [
        {
          key: 'products',
          label: 'Producto',
          maxItems: 5,
          fields: [
            { key: 'name', label: 'Nombre del producto', type: 'text', required: true },
            { key: 'price', label: 'Precio (USD)', type: 'number', required: true },
            { key: 'description', label: 'Descripción', type: 'textarea' },
            { key: 'photo', label: 'Foto del producto', type: 'file' },
          ],
        },
      ],
    },
    {
      title: 'Competencia y metas',
      fields: [
        { key: 'competitors', label: 'Principales competidores', type: 'textarea' },
        { key: 'monthly_goal', label: 'Meta mensual de ventas', type: 'text' },
        { key: 'current_channels', label: 'Canales de venta actuales', type: 'textarea' },
      ],
    },
  ],
  servicio: [
    {
      title: 'Información del negocio',
      fields: [
        { key: 'business_description', label: 'Descripción del servicio', type: 'textarea', required: true },
        { key: 'target_audience', label: 'Público objetivo', type: 'textarea', required: true },
        { key: 'unique_value', label: 'Diferenciador principal', type: 'textarea', required: true },
        { key: 'website', label: 'Sitio web', type: 'url', placeholder: 'https://...' },
      ],
    },
    {
      title: 'Servicios ofrecidos',
      fields: [],
      repeatables: [
        {
          key: 'services',
          label: 'Servicio',
          maxItems: 5,
          fields: [
            { key: 'name', label: 'Nombre del servicio', type: 'text', required: true },
            { key: 'price_range', label: 'Rango de precio', type: 'text', required: true },
            { key: 'description', label: 'Descripción', type: 'textarea' },
            { key: 'duration', label: 'Duración / entrega', type: 'text' },
          ],
        },
      ],
    },
    {
      title: 'Proceso y metas',
      fields: [
        { key: 'sales_process', label: 'Proceso de venta actual', type: 'textarea' },
        { key: 'monthly_goal', label: 'Meta mensual', type: 'text' },
        { key: 'current_leads', label: 'Fuentes actuales de leads', type: 'textarea' },
      ],
    },
  ],
  restaurante: [
    {
      title: 'Información del restaurante',
      fields: [
        { key: 'restaurant_name', label: 'Nombre del restaurante', type: 'text', required: true },
        { key: 'cuisine_type', label: 'Tipo de cocina', type: 'text', required: true },
        { key: 'location', label: 'Ubicación', type: 'text', required: true },
        { key: 'capacity', label: 'Capacidad', type: 'number' },
        { key: 'hours', label: 'Horario de operación', type: 'text' },
        { key: 'website', label: 'Sitio web', type: 'url', placeholder: 'https://...' },
      ],
    },
    {
      title: 'Menú principal',
      fields: [
        { key: 'menu_photo', label: 'Foto del menú', type: 'file' },
      ],
      repeatables: [
        {
          key: 'menu_items',
          label: 'Plato destacado',
          maxItems: 5,
          fields: [
            { key: 'name', label: 'Nombre del plato', type: 'text', required: true },
            { key: 'price', label: 'Precio', type: 'number' },
            { key: 'description', label: 'Descripción', type: 'text' },
            { key: 'photo', label: 'Foto', type: 'file' },
          ],
        },
      ],
    },
    {
      title: 'Presencia y metas',
      fields: [
        { key: 'delivery_platforms', label: 'Plataformas de delivery', type: 'textarea' },
        { key: 'monthly_revenue_goal', label: 'Meta de revenue mensual', type: 'text' },
        { key: 'special_events', label: 'Eventos especiales / promociones', type: 'textarea' },
      ],
    },
  ],
  software: [
    {
      title: 'Información del producto',
      fields: [
        { key: 'product_name', label: 'Nombre del software', type: 'text', required: true },
        { key: 'description', label: 'Descripción del producto', type: 'textarea', required: true },
        { key: 'target_market', label: 'Mercado objetivo', type: 'textarea', required: true },
        { key: 'pricing_model', label: 'Modelo de pricing', type: 'select', options: ['SaaS mensual', 'Anual', 'One-time', 'Freemium', 'Otro'] },
        { key: 'website', label: 'Sitio web', type: 'url', placeholder: 'https://...' },
        { key: 'demo_url', label: 'URL de demo', type: 'url', placeholder: 'https://...' },
      ],
    },
    {
      title: 'Features principales',
      fields: [],
      repeatables: [
        {
          key: 'features',
          label: 'Feature',
          maxItems: 5,
          fields: [
            { key: 'name', label: 'Nombre', type: 'text', required: true },
            { key: 'description', label: 'Descripción', type: 'textarea' },
            { key: 'screenshot', label: 'Screenshot', type: 'file' },
          ],
        },
      ],
    },
    {
      title: 'Métricas y metas',
      fields: [
        { key: 'current_users', label: 'Usuarios actuales', type: 'number' },
        { key: 'mrr', label: 'MRR actual (USD)', type: 'number' },
        { key: 'growth_goal', label: 'Meta de crecimiento', type: 'textarea' },
        { key: 'main_competitors', label: 'Competidores principales', type: 'textarea' },
      ],
    },
  ],
  salud: [
    {
      title: 'Información de la práctica',
      fields: [
        { key: 'practice_name', label: 'Nombre de la práctica/clínica', type: 'text', required: true },
        { key: 'specialty', label: 'Especialidad', type: 'text', required: true },
        { key: 'location', label: 'Ubicación', type: 'text', required: true },
        { key: 'doctor_name', label: 'Nombre del profesional', type: 'text', required: true },
        { key: 'website', label: 'Sitio web', type: 'url', placeholder: 'https://...' },
      ],
    },
    {
      title: 'Servicios médicos',
      fields: [],
      repeatables: [
        {
          key: 'medical_services',
          label: 'Servicio',
          maxItems: 5,
          fields: [
            { key: 'name', label: 'Nombre del servicio', type: 'text', required: true },
            { key: 'price', label: 'Precio', type: 'number' },
            { key: 'description', label: 'Descripción', type: 'textarea' },
          ],
        },
      ],
    },
    {
      title: 'Pacientes y metas',
      fields: [
        { key: 'current_patients', label: 'Pacientes mensuales actuales', type: 'number' },
        { key: 'patient_goal', label: 'Meta de pacientes nuevos/mes', type: 'number' },
        { key: 'referral_sources', label: 'Fuentes de referidos actuales', type: 'textarea' },
      ],
    },
  ],
  real_estate: [
    {
      title: 'Información de la inmobiliaria',
      fields: [
        { key: 'company_name', label: 'Nombre de la empresa', type: 'text', required: true },
        { key: 'agent_name', label: 'Nombre del agente', type: 'text', required: true },
        { key: 'location', label: 'Zona de operación', type: 'text', required: true },
        { key: 'specialization', label: 'Especialización', type: 'select', options: ['Residencial', 'Comercial', 'Lotes', 'Alquileres', 'Lujo', 'Otro'] },
        { key: 'website', label: 'Sitio web', type: 'url', placeholder: 'https://...' },
      ],
    },
    {
      title: 'Propiedades destacadas',
      fields: [],
      repeatables: [
        {
          key: 'properties',
          label: 'Propiedad',
          maxItems: 3,
          fields: [
            { key: 'title', label: 'Título/nombre', type: 'text', required: true },
            { key: 'price', label: 'Precio (USD)', type: 'number', required: true },
            { key: 'location', label: 'Ubicación', type: 'text' },
            { key: 'description', label: 'Descripción', type: 'textarea' },
            { key: 'photos', label: 'Fotos', type: 'file' },
          ],
        },
      ],
    },
    {
      title: 'Mercado y metas',
      fields: [
        { key: 'avg_deal_size', label: 'Tamaño promedio de operación (USD)', type: 'number' },
        { key: 'monthly_goal', label: 'Meta mensual de cierres', type: 'number' },
        { key: 'current_listings', label: 'Listings actuales', type: 'number' },
        { key: 'lead_sources', label: 'Fuentes actuales de leads', type: 'textarea' },
      ],
    },
  ],
}

const BUSINESS_TYPE_LABELS: Record<string, string> = {
  producto: 'Venta de Producto',
  servicio: 'Venta de Servicio',
  restaurante: 'Restaurante',
  software: 'Software',
  salud: 'Salud',
  real_estate: 'Real Estate',
}

interface BusinessFormProps {
  clientId: string
  existingForm?: ClientForm | null
}

export function BusinessForm({ clientId, existingForm }: BusinessFormProps) {
  const router = useRouter()
  const [businessType, setBusinessType] = useState<string>(existingForm?.business_type ?? '')
  const [formData, setFormData] = useState<Record<string, unknown>>(
    (existingForm?.form_data as Record<string, unknown>) ?? {}
  )
  const [saving, setSaving] = useState(false)
  const [fileUploads, setFileUploads] = useState<Record<string, string>>({})

  const sections = businessType ? FORM_SCHEMAS[businessType] ?? [] : []

  const calculateProgress = useCallback(() => {
    if (!businessType || sections.length === 0) return 0
    let totalRequired = 0
    let filledRequired = 0

    for (const section of sections) {
      for (const field of section.fields) {
        if (field.required) {
          totalRequired++
          const val = formData[field.key]
          if (val && String(val).trim()) filledRequired++
        }
      }
      for (const rep of section.repeatables ?? []) {
        const items = (formData[rep.key] as Record<string, unknown>[]) ?? []
        if (items.length > 0) {
          for (const item of items) {
            for (const field of rep.fields) {
              if (field.required) {
                totalRequired++
                const val = item[field.key]
                if (val && String(val).trim()) filledRequired++
              }
            }
          }
        } else {
          for (const field of rep.fields) {
            if (field.required) totalRequired++
          }
        }
      }
    }

    return totalRequired === 0 ? 100 : Math.round((filledRequired / totalRequired) * 100)
  }, [businessType, formData, sections])

  const progress = calculateProgress()

  function updateField(key: string, value: unknown) {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  function addRepeatableItem(sectionKey: string) {
    setFormData((prev) => {
      const items = ((prev[sectionKey] as Record<string, unknown>[]) ?? []).slice()
      items.push({})
      return { ...prev, [sectionKey]: items }
    })
  }

  function removeRepeatableItem(sectionKey: string, index: number) {
    setFormData((prev) => {
      const items = ((prev[sectionKey] as Record<string, unknown>[]) ?? []).slice()
      items.splice(index, 1)
      return { ...prev, [sectionKey]: items }
    })
  }

  function updateRepeatableField(sectionKey: string, index: number, fieldKey: string, value: unknown) {
    setFormData((prev) => {
      const items = ((prev[sectionKey] as Record<string, unknown>[]) ?? []).map((item, i) =>
        i === index ? { ...item, [fieldKey]: value } : item
      )
      return { ...prev, [sectionKey]: items }
    })
  }

  function handleFileChange(fieldKey: string, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setFileUploads((prev) => ({ ...prev, [fieldKey]: file.name }))
      updateField(fieldKey, `[FILE] ${file.name}`)
    }
    reader.readAsDataURL(file)
  }

  async function handleSave(markComplete = false) {
    setSaving(true)
    try {
      const finalProgress = markComplete ? 100 : progress
      await saveClientForm(clientId, businessType, formData, finalProgress, markComplete)
      toast.success(markComplete ? 'Formulario completado' : 'Progreso guardado')
      router.refresh()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (!businessType) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Seleccioná el tipo de negocio</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Object.entries(BUSINESS_TYPE_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setBusinessType(key)}
              className="rounded-xl border border-border bg-surface-2 p-4 text-left hover:border-primary/50 transition-colors"
            >
              <p className="font-medium">{label}</p>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const missingSections = sections.filter((section) => {
    const hasEmptyRequired = section.fields.some((f) => f.required && !formData[f.key])
    const hasEmptyRepeatables = (section.repeatables ?? []).some((rep) => {
      const items = (formData[rep.key] as Record<string, unknown>[]) ?? []
      return items.length === 0 || items.some((item) => rep.fields.some((f) => f.required && !item[f.key]))
    })
    return hasEmptyRequired || hasEmptyRepeatables
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">
            Formulario: {BUSINESS_TYPE_LABELS[businessType]}
          </h3>
          {missingSections.length > 0 && (
            <p className="text-xs text-warning mt-1">
              Te faltan {missingSections.length} sección{missingSections.length > 1 ? 'es' : ''} por completar
            </p>
          )}
        </div>
        <Button variant="ghost" size="sm" onClick={() => setBusinessType('')} className="text-xs">
          Cambiar tipo
        </Button>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Progreso</span>
          <span>{progress}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {sections.map((section, sIdx) => (
        <div key={sIdx} className="rounded-xl border border-border bg-surface-1 p-4 space-y-4">
          <h4 className="text-sm font-medium">{section.title}</h4>

          {section.fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <Label>
                {field.label}
                {field.required && <span className="text-destructive"> *</span>}
              </Label>
              {field.type === 'textarea' ? (
                <Textarea
                  value={String(formData[field.key] ?? '')}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                />
              ) : field.type === 'select' ? (
                <Select
                  value={String(formData[field.key] ?? '')}
                  onValueChange={(v) => updateField(field.key, v)}
                >
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent className="bg-surface-3">
                    {field.options?.map((opt) => (
                      <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : field.type === 'file' ? (
                <div>
                  <Input
                    type="file"
                    accept="image/*,.pdf"
                    onChange={(e) => handleFileChange(field.key, e)}
                    className="text-xs"
                  />
                  {fileUploads[field.key] && (
                    <p className="text-xs text-muted-foreground mt-1">{fileUploads[field.key]}</p>
                  )}
                </div>
              ) : (
                <Input
                  type={field.type === 'number' ? 'number' : field.type === 'url' ? 'url' : 'text'}
                  value={String(formData[field.key] ?? '')}
                  onChange={(e) => updateField(field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                  placeholder={field.placeholder}
                  step={field.type === 'number' ? '0.01' : undefined}
                />
              )}
            </div>
          ))}

          {section.repeatables?.map((rep) => {
            const items = (formData[rep.key] as Record<string, unknown>[]) ?? []
            return (
              <div key={rep.key} className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">{rep.label}s ({items.length}/{rep.maxItems})</Label>
                  {items.length < rep.maxItems && (
                    <Button type="button" variant="outline" size="sm" onClick={() => addRepeatableItem(rep.key)} className="gap-1 text-xs">
                      <Plus className="h-3 w-3" />
                      Agregar {rep.label.toLowerCase()}
                    </Button>
                  )}
                </div>

                {items.map((item, itemIdx) => (
                  <div key={itemIdx} className="rounded-lg border border-border bg-surface-2 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">{rep.label} #{itemIdx + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeRepeatableItem(rep.key, itemIdx)}
                        className="h-6 w-6 p-0 text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    {rep.fields.map((field) => (
                      <div key={field.key} className="space-y-1">
                        <Label className="text-xs">
                          {field.label}
                          {field.required && <span className="text-destructive"> *</span>}
                        </Label>
                        {field.type === 'textarea' ? (
                          <Textarea
                            value={String(item[field.key] ?? '')}
                            onChange={(e) => updateRepeatableField(rep.key, itemIdx, field.key, e.target.value)}
                            rows={2}
                            className="text-sm"
                          />
                        ) : field.type === 'file' ? (
                          <Input
                            type="file"
                            accept="image/*,.pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) updateRepeatableField(rep.key, itemIdx, field.key, `[FILE] ${file.name}`)
                            }}
                            className="text-xs"
                          />
                        ) : (
                          <Input
                            type={field.type === 'number' ? 'number' : 'text'}
                            value={String(item[field.key] ?? '')}
                            onChange={(e) => updateRepeatableField(rep.key, itemIdx, field.key, field.type === 'number' ? Number(e.target.value) : e.target.value)}
                            className="text-sm"
                            step={field.type === 'number' ? '0.01' : undefined}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ))}

                {items.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No hay {rep.label.toLowerCase()}s agregados. Hacé clic en &quot;Agregar&quot; para empezar.
                  </p>
                )}
              </div>
            )
          })}
        </div>
      ))}

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => handleSave(false)} disabled={saving} className="gap-1">
          <Save className="h-4 w-4" />
          {saving ? 'Guardando...' : 'Guardar progreso'}
        </Button>
        <Button onClick={() => handleSave(true)} disabled={saving || progress < 100} className="gap-1">
          <CheckCircle className="h-4 w-4" />
          Marcar como completado
        </Button>
      </div>
    </div>
  )
}
