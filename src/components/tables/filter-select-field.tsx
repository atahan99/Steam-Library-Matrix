"use client"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select"
import { TableFilterField } from "@/components/tables/table-filter-field"

export type FilterSelectFieldProps = {
  id: string
  title: string
  value: string
  onValueChange: (value: string | null) => void
  options: { value: string; label: string }[]
  className?: string
}

export const FilterSelectField = ({
  id,
  title,
  value,
  onValueChange,
  options,
  className,
}: FilterSelectFieldProps) => {
  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? value

  return (
    <TableFilterField label={title} htmlFor={id} className={className}>
      <Select
        value={value}
        onValueChange={(next) => onValueChange(next as string | null)}
      >
        <SelectTrigger
          id={id}
          className="w-full min-w-0"
          aria-label={`${title}: ${selectedLabel}`}
        >
          <span className="truncate">{selectedLabel}</span>
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
  )
}
