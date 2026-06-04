"use client"

import { ChevronDown } from "lucide-react"
import {
  PlatformIcon,
  platformAriaLabel,
  type Platform,
} from "@/components/icons/platform-icon"
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
import type { OsFilterPlatform } from "@/lib/utils/platform-support"

const OS_OPTIONS: Platform[] = ["windows", "linux", "mac"]

type OsSupportMultiSelectProps = {
  selected: OsFilterPlatform[]
  onSelectedChange: (platforms: OsFilterPlatform[]) => void
  id?: string
}

export const OsSupportMultiSelect = ({
  selected,
  onSelectedChange,
  id = "os-filter",
}: OsSupportMultiSelectProps) => {
  const handleToggle = (platform: OsFilterPlatform, checked: boolean) => {
    if (checked) {
      onSelectedChange([...selected, platform])
      return
    }
    onSelectedChange(selected.filter((p) => p !== platform))
  }

  const handleClear = () => onSelectedChange([])

  const triggerLabel =
    selected.length === 0
      ? "All OS"
      : selected.length === 1
        ? platformAriaLabel(selected[0])
        : `${selected.length} platforms`

  return (
    <TableFilterField label="OS" htmlFor={id}>
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id}
          render={
            <Button
              variant="outline"
              className="h-8 w-full min-w-0 justify-between font-normal"
              aria-label="Filter by operating system"
            />
          }
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-72" align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Operating systems</DropdownMenuLabel>
            {OS_OPTIONS.map((platform) => (
              <DropdownMenuCheckboxItem
                key={platform}
                checked={selected.includes(platform)}
                onCheckedChange={(checked) =>
                  handleToggle(platform, checked === true)
                }
              >
                <span className="inline-flex items-center gap-2">
                  <PlatformIcon platform={platform} className="size-4" />
                  {platformAriaLabel(platform)}
                </span>
              </DropdownMenuCheckboxItem>
            ))}
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
