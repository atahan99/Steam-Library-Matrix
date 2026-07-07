"use client"

import { TableMultiSelect } from "@/components/tables/table-multi-select"

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
}: AntiCheatSoftwareMultiSelectProps) => (
  <TableMultiSelect
    id={id}
    fieldLabel="Anti-cheat software"
    menuLabel="Anti-cheat software"
    allLabel="All software"
    countLabel={(count) => `${count} selected`}
    ariaLabel="Filter by anti-cheat software"
    className="min-w-[11rem]"
    options={options.filter((option) => option.value !== "all")}
    selected={selected}
    onSelectedChange={onSelectedChange}
    emptyMessage="No software names in the current table set."
  />
)
