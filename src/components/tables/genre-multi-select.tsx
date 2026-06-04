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

type GenreMultiSelectProps = {
  options: string[]
  selected: string[]
  onSelectedChange: (genres: string[]) => void
  id?: string
}

export const GenreMultiSelect = ({
  options,
  selected,
  onSelectedChange,
  id = "genre-filter",
}: GenreMultiSelectProps) => {
  const handleToggle = (genre: string, checked: boolean) => {
    if (checked) {
      onSelectedChange([...selected, genre])
      return
    }
    onSelectedChange(selected.filter((g) => g !== genre))
  }

  const handleClear = () => onSelectedChange([])

  const triggerLabel =
    selected.length === 0
      ? "All genres"
      : selected.length === 1
        ? selected[0]
        : `${selected.length} genres`

  return (
    <TableFilterField label="Genre" htmlFor={id}>
      <DropdownMenu>
        <DropdownMenuTrigger
          id={id}
          render={
            <Button
              variant="outline"
              className="h-8 w-full min-w-0 justify-between font-normal"
              aria-label="Filter by genre"
            />
          }
        >
          <span className="truncate">{triggerLabel}</span>
          <ChevronDown className="size-4 shrink-0 opacity-50" aria-hidden />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="max-h-72" align="start">
          <DropdownMenuGroup>
            <DropdownMenuLabel>Genres</DropdownMenuLabel>
            {options.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                No genre data yet. Run Steam app details from Data Status.
              </p>
            ) : (
              options.map((genre) => (
                <DropdownMenuCheckboxItem
                  key={genre}
                  checked={selected.includes(genre)}
                  onCheckedChange={(checked) =>
                    handleToggle(genre, checked === true)
                  }
                >
                  {genre}
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
