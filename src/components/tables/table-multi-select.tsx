"use client"

import type { ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { TableFilterField } from "@/components/tables/table-filter-field"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export type TableMultiSelectOption<T extends string = string> = {
  value: T
  label: string
}

type TableMultiSelectProps<T extends string> = {
  fieldLabel: string
  menuLabel: string
  allLabel: string
  countLabel: (count: number) => string
  ariaLabel: string
  options: readonly T[] | readonly TableMultiSelectOption<T>[]
  selected: T[]
  onSelectedChange: (values: T[]) => void
  id?: string
  className?: string
  emptyMessage?: string
  renderOption?: (value: T, label: string) => ReactNode
  resolveLabel?: (value: T) => string
}

const normalizeOptions = <T extends string>(
  options: readonly T[] | readonly TableMultiSelectOption<T>[]
): TableMultiSelectOption<T>[] =>
  options.map((option) =>
    typeof option === "string" ? { value: option, label: option } : option
  )

export const TableMultiSelect = <T extends string>({
  fieldLabel,
  menuLabel,
  allLabel,
  countLabel,
  ariaLabel,
  options,
  selected,
  onSelectedChange,
  id,
  className,
  emptyMessage,
  renderOption,
  resolveLabel,
}: TableMultiSelectProps<T>) => {
  const normalized = normalizeOptions(options)

  const handleToggle = (value: T, checked: boolean) => {
    if (checked) {
      onSelectedChange([...selected, value])
      return
    }
    onSelectedChange(selected.filter((item) => item !== value))
  }

  const handleClear = () => onSelectedChange([])

  const triggerLabel =
    selected.length === 0
      ? allLabel
      : selected.length === 1
        ? resolveLabel?.(selected[0]) ?? selected[0]
        : countLabel(selected.length)

  return (
    <TableFilterField label={fieldLabel} htmlFor={id} className={className}>
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id}
          render={
            <Button
              variant="outline"
              className="h-8 w-full min-w-0 justify-between font-normal"
              aria-label={ariaLabel}
            />
          }
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-72" align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{menuLabel}</DropdownMenuLabel>
            {normalized.length === 0 && emptyMessage ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                {emptyMessage}
              </p>
            ) : (
              normalized.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={selected.includes(option.value)}
                  onCheckedChange={(checked) =>
                    handleToggle(option.value, checked === true)
                  }
                >
                  {renderOption
                    ? renderOption(option.value, option.label)
                    : option.label}
                </DropdownMenuCheckboxItem>
              ))
            )}
          </DropdownMenuGroup>
          {selected.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleClear}
                className="text-muted-foreground"
              >
                Clear selection
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
    </TableFilterField>
  )
}
