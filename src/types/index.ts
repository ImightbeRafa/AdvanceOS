export type UserRole = 'setter' | 'closer' | 'admin' | 'delivery'

export type SetStatus =
  | 'agendado'
  | 'precall_enviado'
  | 'reagendo'
  | 'no_show'
  | 'seguimiento'
  | 'descalificado'
  | 'closed'
  | 'closed_pendiente'

export type DealOutcome = 'closed' | 'follow_up' | 'descalificado'

export type ServiceType = 'advance90' | 'meta_advance'
export type ClientService = 'advance90' | 'meta_advance' | 'retencion'
export type ClientStatus = 'onboarding' | 'activo' | 'pausado' | 'completado'

export type PaymentMethod = 'transferencia' | 'sinpe' | 'tilopay' | 'crypto' | 'otro'
export type TilopayInstallmentMonths = 3 | 6 | 12

export type PhaseStatus = 'pendiente' | 'en_progreso' | 'completado'

export type ExpenseCategory = 'ads' | 'software' | 'oficina' | 'otro'
export type SalaryPaymentStatus = 'pendiente' | 'pagado'
export type AssetType = 'guion' | 'video' | 'diseno' | 'link' | 'otro'

export type BusinessType =
  | 'producto'
  | 'servicio'
  | 'restaurante'
  | 'software'
  | 'salud'
  | 'real_estate'

export interface Profile {
  id: string
  full_name: string
  whatsapp: string
  bac_account_encrypted: string | null
  role: UserRole
  salary: number | null
  salary_notes: string | null
  admin_notes: string | null
  active: boolean
  created_at: string
  avatar_url: string | null
  email: string | null
}

export interface Set {
  id: string
  prospect_name: string
  prospect_whatsapp: string
  prospect_ig: string
  prospect_web: string | null
  setter_id: string
  closer_id: string
  scheduled_at: string
  summary: string
  service_offered: ServiceType
  status: SetStatus
  is_duplicate: boolean
  created_at: string
  updated_at: string
  setter?: Profile
  closer?: Profile
  deal?: Deal
  payments?: Payment[]
}

export interface Deal {
  id: string
  set_id: string
  outcome: DealOutcome
  service_sold: ClientService | null
  revenue_total: number | null
  follow_up_date: string | null
  follow_up_notes: string | null
  disqualified_reason: string | null
  phantom_link: string | null
  closer_notes: string | null
  created_at: string
}

export interface Payment {
  id: string
  set_id: string
  client_id: string | null
  amount_gross: number
  payment_method: PaymentMethod
  tilopay_installment_months: TilopayInstallmentMonths | null
  fee_percentage: number
  fee_amount: number
  amount_net: number
  payment_date: string
  notes: string | null
  created_at: string
  commissions?: Commission[]
}

export interface Commission {
  id: string
  payment_id: string
  team_member_id: string
  role: 'setter' | 'closer'
  percentage: number
  amount: number
  is_paid: boolean
  paid_date: string | null
  created_at: string
  team_member?: Profile
  payment?: Payment
}

export interface Client {
  id: string
  deal_id: string
  set_id: string
  business_name: string
  contact_name: string
  whatsapp: string
  ig: string
  web: string | null
  service: ClientService
  status: ClientStatus
  assigned_to: string | null
  created_at: string
  deal?: Deal
  set?: Set
  assigned_member?: Profile
}

export interface OnboardingChecklistItem {
  id: string
  client_id: string
  item_key: string
  label: string
  completed: boolean
  completed_at: string | null
  completed_by: string | null
}

export interface ClientForm {
  id: string
  client_id: string
  business_type: BusinessType
  form_data: Record<string, unknown>
  progress_pct: number
  completed: boolean
  created_at: string
}

export interface Advance90Phase {
  id: string
  client_id: string
  phase_name: string
  start_day: number
  end_day: number
  start_date: string
  end_date: string
  status: PhaseStatus
  order: number
}

export interface ClientAsset {
  id: string
  client_id: string
  type: AssetType
  name: string
  url: string
  notes: string | null
  uploaded_by: string | null
  created_at: string
}

export interface Expense {
  id: string
  category: ExpenseCategory
  description: string
  amount_usd: number
  date: string
  recurring: boolean
  created_at: string
}

export interface AdSpend {
  id: string
  period_start: string
  period_end: string
  amount_usd: number
  platform: string
  notes: string | null
  created_at: string
}

export interface SalaryPayment {
  id: string
  team_member_id: string
  period_label: string
  amount: number
  status: SalaryPaymentStatus
  paid_date: string | null
  created_at: string
  team_member?: Profile
}

export interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  message: string
  action_url: string | null
  read: boolean
  created_at: string
}

export interface ActivityLogEntry {
  id: string
  entity_type: string
  entity_id: string
  action: string
  user_id: string
  details: Record<string, unknown>
  created_at: string
  user?: Profile
}

export interface ExchangeRate {
  id: string
  date: string
  usd_to_crc: number
  source: string
  created_at: string
}

export type FeedbackCategory = 'bug' | 'sugerencia' | 'pregunta' | 'queja' | 'otro'
export type FeedbackPriority = 'baja' | 'media' | 'alta' | 'urgente'
export type FeedbackStatus = 'abierto' | 'en_revision' | 'resuelto' | 'cerrado'

export interface FeedbackContext {
  page_url: string
  page_title: string
  nav_trail: string[]
  browser: string
  screen: string
  timestamp: string
}

export interface FeedbackTicket {
  id: string
  user_id: string
  category: FeedbackCategory
  priority: FeedbackPriority
  subject: string
  description: string
  status: FeedbackStatus
  assigned_to: string | null
  admin_notes: string | null
  metadata: FeedbackContext | null
  created_at: string
  updated_at: string
  user?: Profile
  assigned_member?: Profile
  replies?: FeedbackReply[]
}

export interface FeedbackReply {
  id: string
  ticket_id: string
  user_id: string
  message: string
  is_internal: boolean
  created_at: string
  user?: Profile
}
