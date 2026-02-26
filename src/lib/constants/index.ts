import type { SetStatus, UserRole, ClientStatus, PaymentMethod, FeedbackCategory, FeedbackPriority, FeedbackStatus } from '@/types'

export const SET_STATUS_LABELS: Record<SetStatus, string> = {
  agendado: 'Agendado',
  precall_enviado: 'Pre-call enviado',
  reagendo: 'Re-agendó',
  no_show: 'No show',
  seguimiento: 'Seguimiento',
  descalificado: 'Descalificado',
  closed: 'Closed',
  closed_pendiente: 'Closed (pendientes pagos)',
}

export const SET_STATUS_COLORS: Record<SetStatus, string> = {
  agendado: 'bg-info/15 text-info',
  precall_enviado: 'bg-info/15 text-info',
  reagendo: 'bg-warning/15 text-warning',
  no_show: 'bg-destructive/15 text-destructive',
  seguimiento: 'bg-warning/15 text-warning',
  descalificado: 'bg-muted text-muted-foreground',
  closed: 'bg-success/15 text-success',
  closed_pendiente: 'bg-warning/15 text-warning',
}

export const VALID_STATUS_TRANSITIONS: Record<SetStatus, SetStatus[]> = {
  agendado: ['precall_enviado', 'reagendo', 'no_show', 'seguimiento', 'descalificado', 'closed', 'closed_pendiente'],
  precall_enviado: ['reagendo', 'no_show', 'seguimiento', 'descalificado', 'closed', 'closed_pendiente'],
  reagendo: ['agendado', 'precall_enviado', 'no_show', 'seguimiento', 'descalificado', 'closed', 'closed_pendiente'],
  no_show: ['reagendo', 'seguimiento', 'descalificado'],
  seguimiento: ['agendado', 'reagendo', 'descalificado', 'closed', 'closed_pendiente'],
  descalificado: [],
  closed: [],
  closed_pendiente: ['closed'],
}

export const ROLE_LABELS: Record<UserRole, string> = {
  setter: 'Setter',
  closer: 'Closer',
  admin: 'Administrador',
  delivery: 'Delivery',
}

export const ROLE_COLORS: Record<UserRole, string> = {
  setter: 'bg-chart-1/15 text-chart-1',
  closer: 'bg-chart-2/15 text-chart-2',
  admin: 'bg-chart-4/15 text-chart-4',
  delivery: 'bg-chart-3/15 text-chart-3',
}

export const CLIENT_STATUS_LABELS: Record<ClientStatus, string> = {
  onboarding: 'Onboarding',
  activo: 'Activo',
  pausado: 'Pausado',
  completado: 'Completado',
}

export const CLIENT_STATUS_COLORS: Record<ClientStatus, string> = {
  onboarding: 'bg-info/15 text-info',
  activo: 'bg-success/15 text-success',
  pausado: 'bg-warning/15 text-warning',
  completado: 'bg-muted text-muted-foreground',
}

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  transferencia: 'Transferencia',
  sinpe: 'SINPE',
  tilopay: 'Tilopay',
  crypto: 'Crypto',
  otro: 'Otro',
}

export const SERVICE_LABELS = {
  advance90: 'Advance90',
  meta_advance: 'Meta Advance',
  retencion: 'Retención',
} as const

export const TILOPAY_FEE_TABLE: Record<number, number> = {
  3: 0.075,
  6: 0.10,
  12: 0.14,
}

export const COMMISSION_RATES = {
  setter: 0.05,
  closer: 0.10,
} as const

export const ONBOARDING_CHECKLIST_TEMPLATE = [
  { key: 'crear_grupo_wa', label: 'Crear grupo WhatsApp' },
  { key: 'enviar_bienvenida', label: 'Enviar bienvenida' },
  { key: 'enviar_formulario', label: 'Enviar formulario (según tipo de negocio)' },
  { key: 'enviar_link_kickoff', label: 'Enviar link para agendar kickoff' },
  { key: 'kickoff_completado', label: 'Marcar kickoff como hecho' },
] as const

export const ADVANCE90_PHASES = [
  { name: 'Onboarding', start_day: 0, end_day: 7, order: 1 },
  { name: 'Guiones R1', start_day: 7, end_day: 14, order: 2 },
  { name: 'Grabación y Edición R1', start_day: 14, end_day: 25, order: 3 },
  { name: 'Publicación + Pauta R1', start_day: 25, end_day: 30, order: 4 },
  { name: 'Optimización', start_day: 31, end_day: 60, order: 5 },
  { name: 'Ronda 2 (Data-driven)', start_day: 61, end_day: 90, order: 6 },
  { name: 'Llamada Final', start_day: 90, end_day: 90, order: 7 },
] as const

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  bug: 'Bug',
  sugerencia: 'Sugerencia',
  pregunta: 'Pregunta',
  queja: 'Queja',
  otro: 'Otro',
}

export const FEEDBACK_CATEGORY_COLORS: Record<FeedbackCategory, string> = {
  bug: 'bg-destructive/15 text-destructive',
  sugerencia: 'bg-info/15 text-info',
  pregunta: 'bg-chart-3/15 text-chart-3',
  queja: 'bg-warning/15 text-warning',
  otro: 'bg-muted text-muted-foreground',
}

export const FEEDBACK_PRIORITY_LABELS: Record<FeedbackPriority, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
}

export const FEEDBACK_PRIORITY_COLORS: Record<FeedbackPriority, string> = {
  baja: 'bg-muted text-muted-foreground',
  media: 'bg-info/15 text-info',
  alta: 'bg-warning/15 text-warning',
  urgente: 'bg-destructive/15 text-destructive',
}

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  abierto: 'Abierto',
  en_revision: 'En revisión',
  resuelto: 'Resuelto',
  cerrado: 'Cerrado',
}

export const FEEDBACK_STATUS_COLORS: Record<FeedbackStatus, string> = {
  abierto: 'bg-info/15 text-info',
  en_revision: 'bg-warning/15 text-warning',
  resuelto: 'bg-success/15 text-success',
  cerrado: 'bg-muted text-muted-foreground',
}

export const NAV_ITEMS = [
  { label: 'Inicio', href: '/', icon: 'LayoutDashboard', roles: ['admin', 'setter', 'closer', 'delivery'] as UserRole[] },
  { label: 'Ventas', href: '/ventas', icon: 'Target', roles: ['admin', 'setter', 'closer'] as UserRole[] },
  { label: 'Clientes', href: '/clientes', icon: 'Users', roles: ['admin', 'closer', 'delivery'] as UserRole[] },
  { label: 'Equipo', href: '/equipo', icon: 'UserCog', roles: ['admin'] as UserRole[] },
  { label: 'Planilla', href: '/equipo/planilla', icon: 'Wallet', roles: ['admin'] as UserRole[] },
  { label: 'Contabilidad', href: '/contabilidad', icon: 'DollarSign', roles: ['admin'] as UserRole[] },
  { label: 'Feedback', href: '/feedback', icon: 'MessageSquare', roles: ['admin'] as UserRole[] },
  { label: 'Ajustes', href: '/ajustes', icon: 'Settings', roles: ['admin', 'setter', 'closer', 'delivery'] as UserRole[] },
] as const
