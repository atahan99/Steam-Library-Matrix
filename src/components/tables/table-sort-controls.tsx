"use client"

import {
  TableFilterField,
} from "@/components/tables/table-filter-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import type { SortDirection } from "@/lib/utils/table-sort"

export type TableSortOption = {
  value: string
  label: string
}

type TableSortControlsProps = {
  sortKey: string
  sortDirection: SortDirection
  options: TableSortOption[]
  onSortKeyChange: (key: string) => void
  onSortDirectionChange: (direction: SortDirection) => void
  ariaLabelPrefix?: string
  fieldLabel?: string
  directionLabel?: string
  className?: string
}

export const TableSortControls = ({
  sortKey,
  sortDirection,
  options,
  onSortKeyChange,
  onSortDirectionChange,
  ariaLabelPrefix = "Sort",
  fieldLabel = "Sort by",
  directionLabel = "Order",
  className,
}: TableSortControlsProps) => {
  const sortFieldLabel =
    options.find((option) => option.value === sortKey)?.label ?? sortKey
  const sortOrderLabel = sortDirection === "asc" ? "Ascending" : "Descending"

  return (
    <div className={cn("flex flex-wrap gap-3", className)}>
      <TableFilterField
        label={fieldLabel}
        htmlFor={`${ariaLabelPrefix}-field`}
      >
        <Select
          value={sortKey}
          onValueChange={(v) => onSortKeyChange((v as string | null) ?? sortKey)}
        >
          <SelectTrigger
            id={`${ariaLabelPrefix}-field`}
            className="w-full min-w-0"
            aria-label={`${ariaLabelPrefix} field: ${sortFieldLabel}`}
          >
            <span className="truncate">{sortFieldLabel}</span>
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableFilterField>
      <TableFilterField
        label={directionLabel}
        htmlFor={`${ariaLabelPrefix}-direction`}
      >
        <Select
          value={sortDirection}
          onValueChange={(v) =>
            onSortDirectionChange(
              ((v as string | null) ?? sortDirection) as SortDirection
            )
          }
        >
          <SelectTrigger
            id={`${ariaLabelPrefix}-direction`}
            className="w-full min-w-0"
            aria-label={`${ariaLabelPrefix} order: ${sortOrderLabel}`}
          >
            <span className="truncate">{sortOrderLabel}</span>
          </SelectTrigger>
          <SelectContent align="start" alignItemWithTrigger={false}>
            <SelectItem value="asc">Ascending</SelectItem>
            <SelectItem value="desc">Descending</SelectItem>
          </SelectContent>
        </Select>
      </TableFilterField>
    </div>
  )
}
