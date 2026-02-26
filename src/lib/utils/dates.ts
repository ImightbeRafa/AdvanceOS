import { format, formatDistanceToNow, isToday, isTomorrow, isPast, addDays, isThisWeek, isThisMonth } from 'date-fns'
import { es } from 'date-fns/locale'
import { TZDate } from '@date-fns/tz'

export const CR_TZ = 'America/Costa_Rica'

export function toCR(date: string | Date): TZDate {
  return TZDate.tz(CR_TZ, new Date(date))
}

export function nowCR(): TZDate {
  return TZDate.tz(CR_TZ)
}

export function todayCR(): string {
  return format(nowCR(), 'yyyy-MM-dd')
}

export function monthStartCR(): string {
  const n = nowCR()
  return format(new TZDate(n.getFullYear(), n.getMonth(), 1, CR_TZ), 'yyyy-MM-dd')
}

export function startOfDayCR(date: string): string {
  const d = TZDate.tz(CR_TZ, `${date}T00:00:00`)
  return d.toISOString()
}

export function endOfDayCR(date: string): string {
  const d = TZDate.tz(CR_TZ, `${date}T23:59:59.999`)
  return d.toISOString()
}

export function formatDate(date: string | Date): string {
  return format(toCR(date), 'd MMM yyyy', { locale: es })
}

export function formatDateTime(date: string | Date): string {
  return format(toCR(date), 'd MMM yyyy, h:mm a', { locale: es })
}

export function formatTimeAgo(date: string | Date): string {
  return formatDistanceToNow(toCR(date), { addSuffix: true, locale: es })
}

export function formatShortDate(date: string | Date): string {
  return format(toCR(date), 'dd/MM/yy', { locale: es })
}

export function isDateToday(date: string | Date): boolean {
  return isToday(toCR(date))
}

export function isDateTomorrow(date: string | Date): boolean {
  return isTomorrow(toCR(date))
}

export function isDatePast(date: string | Date): boolean {
  return isPast(toCR(date))
}

export function isDateInWeek(date: string | Date): boolean {
  return isThisWeek(toCR(date), { weekStartsOn: 1 })
}

export function isDateInMonth(date: string | Date): boolean {
  return isThisMonth(toCR(date))
}

export function addDaysToDate(date: string | Date, days: number): Date {
  return addDays(toCR(date), days)
}

export function getDateLabel(date: string | Date): string {
  const d = toCR(date)
  if (isToday(d)) return 'Hoy'
  if (isTomorrow(d)) return 'Mañana'
  if (isPast(d)) return `Hace ${formatDistanceToNow(d, { locale: es })}`
  return formatDate(d)
}
