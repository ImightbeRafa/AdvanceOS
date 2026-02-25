import type { SetStatus, UserRole, TaskStatus, ClientStatus, PaymentMethod } from '@/types'

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

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pendiente: 'Pendiente',
  en_progreso: 'En progreso',
  bloqueado: 'Bloqueado',
  listo: 'Listo',
}

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pendiente: 'bg-muted text-muted-foreground',
  en_progreso: 'bg-info/15 text-info',
  bloqueado: 'bg-destructive/15 text-destructive',
  listo: 'bg-success/15 text-success',
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

export const ADVANCE90_TASKS_TEMPLATE = [
  { phase_order: 1, title: 'Crear grupo WhatsApp', description: null },
  { phase_order: 1, title: 'Enviar bienvenida', description: null },
  { phase_order: 1, title: 'Enviar formulario', description: null },
  { phase_order: 1, title: 'Agendar kickoff', description: null },
  { phase_order: 2, title: 'Escribir 5 guiones', description: null },
  { phase_order: 2, title: 'Revisión de guiones', description: null },
  { phase_order: 2, title: 'Luz verde guiones', description: null },
  { phase_order: 3, title: 'Grabación en locación', description: null },
  { phase_order: 3, title: 'Edición + ajustes por feedback', description: null },
  { phase_order: 4, title: 'Campañas activas con videos aprobados', description: null },
  { phase_order: 5, title: 'Optimización anuncios', description: null },
  { phase_order: 5, title: 'Optimización perfil', description: null },
  { phase_order: 5, title: 'Asesoría ventas + medición', description: null },
  { phase_order: 6, title: 'Guiones R2', description: null },
  { phase_order: 6, title: 'Grabación R2', description: null },
  { phase_order: 6, title: 'Edición R2', description: null },
  { phase_order: 6, title: 'Publicación + pauta R2', description: null },
  { phase_order: 6, title: 'Optimización final fuerte', description: null },
  { phase_order: 7, title: 'Llamada final — resultados', description: null },
  { phase_order: 7, title: 'Aprendizajes y próximos pasos', description: null },
] as const

export const NAV_ITEMS = [
  { label: 'Inicio', href: '/', icon: 'LayoutDashboard', roles: ['admin', 'setter', 'closer', 'delivery'] as UserRole[] },
  { label: 'Ventas', href: '/ventas', icon: 'Target', roles: ['admin', 'setter', 'closer'] as UserRole[] },
  { label: 'Clientes', href: '/clientes', icon: 'Users', roles: ['admin', 'closer', 'delivery'] as UserRole[] },
  { label: 'Equipo', href: '/equipo', icon: 'UserCog', roles: ['admin'] as UserRole[] },
  { label: 'Planilla', href: '/equipo/planilla', icon: 'Wallet', roles: ['admin'] as UserRole[] },
  { label: 'Contabilidad', href: '/contabilidad', icon: 'DollarSign', roles: ['admin'] as UserRole[] },
  { label: 'Ajustes', href: '/ajustes', icon: 'Settings', roles: ['admin', 'setter', 'closer', 'delivery'] as UserRole[] },
] as const
