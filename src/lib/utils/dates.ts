import { format, formatDistanceToNow, isToday, isTomorrow, isPast, addDays } from 'date-fns'
import { es } from 'date-fns/locale'

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'd MMM yyyy', { locale: es })
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'd MMM yyyy, h:mm a', { locale: es })
}

export function formatTimeAgo(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: es })
}

export function formatShortDate(date: string | Date): string {
  return format(new Date(date), 'dd/MM/yy', { locale: es })
}

export function isDateToday(date: string | Date): boolean {
  return isToday(new Date(date))
}

export function isDateTomorrow(date: string | Date): boolean {
  return isTomorrow(new Date(date))
}

export function isDatePast(date: string | Date): boolean {
  return isPast(new Date(date))
}

export function addDaysToDate(date: string | Date, days: number): Date {
  return addDays(new Date(date), days)
}

export function getDateLabel(date: string | Date): string {
  const d = new Date(date)
  if (isToday(d)) return 'Hoy'
  if (isTomorrow(d)) return 'Mañana'
  if (isPast(d)) return `Hace ${formatDistanceToNow(d, { locale: es })}`
  return formatDate(d)
}
