'use client'

import { useState, useMemo, type ReactNode } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface Column<T> {
  key: string
  label: string
  sortable?: boolean
  className?: string
  render: (row: T) => ReactNode
  getValue?: (row: T) => string | number
}

interface DataTableProps<T> {
  data: T[]
  columns: Column<T>[]
  searchPlaceholder?: string
  searchKeys?: (keyof T)[]
  onRowClick?: (row: T) => void
  rowActions?: (row: T) => ReactNode
  emptyMessage?: string
  className?: string
  filters?: ReactNode
}

type SortDirection = 'asc' | 'desc' | null

export function DataTable<T extends { id: string }>({
  data,
  columns,
  searchPlaceholder = 'Buscar...',
  searchKeys = [],
  onRowClick,
  rowActions,
  emptyMessage = 'No hay datos para mostrar.',
  className,
  filters,
}: DataTableProps<T>) {
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>(null)

  const filteredData = useMemo(() => {
    if (!search.trim()) return data
    const term = search.toLowerCase()
    return data.filter((row) =>
      searchKeys.some((key) => {
        const value = row[key]
        return typeof value === 'string' && value.toLowerCase().includes(term)
      })
    )
  }, [data, search, searchKeys])

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return filteredData

    const col = columns.find((c) => c.key === sortKey)
    if (!col?.getValue) return filteredData

    return [...filteredData].sort((a, b) => {
      const aVal = col.getValue!(a)
      const bVal = col.getValue!(b)
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [filteredData, sortKey, sortDirection, columns])

  function handleSort(key: string) {
    if (sortKey === key) {
      if (sortDirection === 'asc') setSortDirection('desc')
      else if (sortDirection === 'desc') {
        setSortKey(null)
        setSortDirection(null)
      }
    } else {
      setSortKey(key)
      setSortDirection('asc')
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        {filters}
      </div>

      <div className="rounded-lg border border-border bg-surface-1 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-border">
              {columns.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn('text-xs font-medium text-muted-foreground', col.className)}
                >
                  {col.sortable ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="-ml-3 h-8 gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
                      onClick={() => handleSort(col.key)}
                    >
                      {col.label}
                      {sortKey === col.key ? (
                        sortDirection === 'asc' ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )
                      ) : (
                        <ChevronsUpDown className="h-3 w-3 opacity-50" />
                      )}
                    </Button>
                  ) : (
                    col.label
                  )}
                </TableHead>
              ))}
              {rowActions && <TableHead className="w-10" />}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (rowActions ? 1 : 0)}
                  className="h-24 text-center text-sm text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              sortedData.map((row) => (
                <TableRow
                  key={row.id}
                  className={cn(
                    'border-border',
                    onRowClick && 'cursor-pointer hover:bg-surface-2/50'
                  )}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((col) => (
                    <TableCell key={col.key} className={cn('text-sm', col.className)}>
                      {col.render(row)}
                    </TableCell>
                  ))}
                  {rowActions && (
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      {rowActions(row)}
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <p className="text-xs text-muted-foreground">
        {sortedData.length} de {data.length} registros
      </p>
    </div>
  )
}
