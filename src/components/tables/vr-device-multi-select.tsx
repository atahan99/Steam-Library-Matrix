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

type VrDeviceMultiSelectProps = {
  options: string[]
  selected: string[]
  onSelectedChange: (devices: string[]) => void
  id?: string
}

export const VrDeviceMultiSelect = ({
  options,
  selected,
  onSelectedChange,
  id = "vr-device-filter",
}: VrDeviceMultiSelectProps) => {
  const handleToggle = (device: string, checked: boolean) => {
    if (checked) {
      onSelectedChange([...selected, device])
      return
    }
    onSelectedChange(selected.filter((d) => d !== device))
  }

  const handleClear = () => onSelectedChange([])

  const triggerLabel =
    selected.length === 0
      ? "All VR devices"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} devices`

  return (
    <TableFilterField label="VR devices" htmlFor={id}>
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id}
          render={
            <Button
              variant="outline"
              className="h-8 w-full min-w-0 justify-between font-normal"
              aria-label="Filter by VR device or feature"
            />
          }
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-72" align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>VR devices</DropdownMenuLabel>
            {options.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                No VR device tags yet. Run Steam app details from Data Status.
              </p>
            ) : (
              options.map((device) => (
                <DropdownMenuCheckboxItem
                  key={device}
                  checked={selected.includes(device)}
                  onCheckedChange={(checked) =>
                    handleToggle(device, checked === true)
                  }
                >
                  {device}
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
