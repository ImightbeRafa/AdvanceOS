import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
})

export const createSetSchema = z.object({
  prospect_name: z.string().min(1, 'El nombre del prospecto es requerido'),
  prospect_whatsapp: z.string().min(8, 'WhatsApp es requerido'),
  prospect_ig: z.string().min(1, 'Instagram del negocio es requerido'),
  prospect_web: z.string().url('URL inválida').optional().or(z.literal('')),
  closer_id: z.string().uuid('Seleccioná un closer'),
  scheduled_at: z.string().min(1, 'La fecha y hora son requeridas'),
  summary: z.string().min(1, 'El resumen de situación es requerido'),
  service_offered: z.enum(['advance90', 'meta_advance'], {
    message: 'Seleccioná el servicio ofrecido',
  }),
})

export const closeDealSchema = z.object({
  service_sold: z.enum(['advance90', 'meta_advance', 'retencion']),
  revenue_total: z.number().positive('El monto debe ser mayor a 0'),
  amount_collected: z.number().min(0, 'El monto no puede ser negativo').optional(),
  payment_method: z.enum(['transferencia', 'sinpe', 'tilopay', 'crypto', 'otro']).optional(),
  tilopay_installment_months: z.number().optional().nullable(),
  phantom_link: z.string().url('URL inválida').optional().or(z.literal('')),
  closer_notes: z.string().optional(),
})

export const followUpSchema = z.object({
  follow_up_notes: z.string().min(1, 'Describí qué pasó en la llamada'),
  follow_up_date: z.string().min(1, 'La fecha de follow up es requerida'),
})

export const disqualifySchema = z.object({
  disqualified_reason: z.string().min(1, 'La razón de descalificación es requerida'),
})

export const paymentSchema = z.object({
  amount_gross: z.number().positive('El monto debe ser mayor a 0'),
  payment_method: z.enum(['transferencia', 'sinpe', 'tilopay', 'crypto', 'otro']),
  tilopay_installment_months: z.number().optional().nullable(),
  payment_date: z.string().min(1, 'La fecha de pago es requerida'),
  notes: z.string().optional(),
})

export const teamMemberSchema = z.object({
  full_name: z.string().min(2, 'El nombre es requerido'),
  whatsapp: z.string().min(8, 'WhatsApp es requerido'),
  role: z.enum(['setter', 'closer', 'admin', 'delivery']),
  salary: z.number().min(0).optional().nullable(),
  salary_notes: z.string().optional(),
  admin_notes: z.string().optional(),
})

export const expenseSchema = z.object({
  category: z.enum(['ads', 'software', 'oficina', 'otro']),
  description: z.string().min(1, 'La descripción es requerida'),
  amount_usd: z.number().positive('El monto debe ser mayor a 0'),
  date: z.string().min(1, 'La fecha es requerida'),
  recurring: z.boolean(),
})

export const adSpendSchema = z.object({
  period_start: z.string().min(1, 'Fecha de inicio requerida'),
  period_end: z.string().min(1, 'Fecha de fin requerida'),
  amount_usd: z.number().positive('El monto debe ser mayor a 0'),
  platform: z.string().min(1, 'La plataforma es requerida'),
  notes: z.string().optional(),
})

export const profileEditSchema = z.object({
  full_name: z.string().min(2, 'El nombre es requerido'),
  whatsapp: z.string().min(8, 'WhatsApp es requerido'),
})

export const passwordChangeSchema = z.object({
  new_password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirm_password: z.string().min(6, 'La confirmación es requerida'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm_password'],
})

export const feedbackTicketSchema = z.object({
  category: z.enum(['bug', 'sugerencia', 'pregunta', 'queja', 'otro'], {
    message: 'Seleccioná una categoría',
  }),
  priority: z.enum(['baja', 'media', 'alta', 'urgente'], {
    message: 'Seleccioná la prioridad',
  }),
  subject: z.string().min(1, 'El asunto es requerido').max(200, 'Máximo 200 caracteres'),
  description: z.string().min(1, 'La descripción es requerida').max(2000, 'Máximo 2000 caracteres'),
})

export const feedbackReplySchema = z.object({
  message: z.string().min(1, 'El mensaje es requerido').max(2000, 'Máximo 2000 caracteres'),
  is_internal: z.boolean(),
})

export const inviteSchema = z.object({
  email: z.string().email('Email inválido'),
  full_name: z.string().min(2, 'El nombre es requerido'),
  role: z.enum(['setter', 'closer', 'admin', 'delivery'], {
    message: 'Seleccioná un rol',
  }),
})

export const setupPasswordSchema = z.object({
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
  confirm_password: z.string().min(6, 'La confirmación es requerida'),
  whatsapp: z.string().min(8, 'WhatsApp es requerido'),
}).refine((data) => data.password === data.confirm_password, {
  message: 'Las contraseñas no coinciden',
  path: ['confirm_password'],
})

export const manualTransactionSchema = z.object({
  type: z.enum(['ingreso', 'egreso'], { message: 'Seleccioná el tipo' }),
  description: z.string().min(1, 'La descripción es requerida'),
  amount_usd: z.number().positive('El monto debe ser mayor a 0'),
  date: z.string().min(1, 'La fecha es requerida'),
  notes: z.string().optional(),
})

export type ManualTransactionFormData = z.infer<typeof manualTransactionSchema>
export type ProfileEditFormData = z.infer<typeof profileEditSchema>
export type PasswordChangeFormData = z.infer<typeof passwordChangeSchema>
export type LoginFormData = z.infer<typeof loginSchema>
export type CreateSetFormData = z.infer<typeof createSetSchema>
export type CloseDealFormData = z.infer<typeof closeDealSchema>
export type FollowUpFormData = z.infer<typeof followUpSchema>
export type DisqualifyFormData = z.infer<typeof disqualifySchema>
export type PaymentFormData = z.infer<typeof paymentSchema>
export type TeamMemberFormData = z.infer<typeof teamMemberSchema>
export type ExpenseFormData = z.infer<typeof expenseSchema>
export type AdSpendFormData = z.infer<typeof adSpendSchema>
export type FeedbackTicketFormData = z.infer<typeof feedbackTicketSchema>
export type FeedbackReplyFormData = z.infer<typeof feedbackReplySchema>
export type InviteFormData = z.infer<typeof inviteSchema>
export type SetupPasswordFormData = z.infer<typeof setupPasswordSchema>
