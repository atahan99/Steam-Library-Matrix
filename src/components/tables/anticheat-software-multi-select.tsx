"use client"

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

type AntiCheatSoftwareMultiSelectProps = {
  options: { value: string; label: string }[]
  selected: string[]
  onSelectedChange: (software: string[]) => void
  id?: string
}

export const AntiCheatSoftwareMultiSelect = ({
  options,
  selected,
  onSelectedChange,
  id = "anticheat-software-filter",
}: AntiCheatSoftwareMultiSelectProps) => {
  const softwareOptions = options.filter((o) => o.value !== "all")

  const handleToggle = (name: string, checked: boolean) => {
    if (checked) {
      onSelectedChange([...selected, name])
      return
    }
    onSelectedChange(selected.filter((s) => s !== name))
  }

  const handleClear = () => onSelectedChange([])

  const triggerLabel =
    selected.length === 0
      ? "All software"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} selected`

  return (
    <TableFilterField
      label="Anti-cheat software"
      htmlFor={id}
      className="min-w-[11rem]"
    >
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id}
          render={
            <Button
              variant="outline"
              className="h-8 w-full min-w-0 justify-between font-normal"
              aria-label="Filter by anti-cheat software"
            />
          }
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-72" align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Anti-cheat software</DropdownMenuLabel>
            {softwareOptions.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                No software names in the current table set.
              </p>
            ) : (
              softwareOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={selected.includes(option.value)}
                  onCheckedChange={(checked) =>
                    handleToggle(option.value, checked === true)
                  }
                >
                  {option.label}
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
