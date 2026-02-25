import { cn } from '@/lib/utils'

interface StatusChipProps {
  label: string
  colorClass: string
  className?: string
  size?: 'sm' | 'md'
}

export function StatusChip({ label, colorClass, className, size = 'sm' }: StatusChipProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium whitespace-nowrap',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm',
        colorClass,
        className
      )}
    >
      {label}
    </span>
  )
}
