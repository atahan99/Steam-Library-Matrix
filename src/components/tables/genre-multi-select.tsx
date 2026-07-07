"use client"

import { TableMultiSelect } from "@/components/tables/table-multi-select"

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
}: GenreMultiSelectProps) => (
  <TableMultiSelect
    id={id}
    fieldLabel="Genre"
    menuLabel="Genres"
    allLabel="All genres"
    countLabel={(count) => `${count} genres`}
    ariaLabel="Filter by genre"
    options={options}
    selected={selected}
    onSelectedChange={onSelectedChange}
    emptyMessage="No genre data yet. Run Steam app details from Data Status."
  />
)
