"use client"

import {
  PlatformIcon,
  platformAriaLabel,
  type Platform,
} from "@/components/icons/platform-icon"
import { TableMultiSelect } from "@/components/tables/table-multi-select"
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
}: OsSupportMultiSelectProps) => (
  <TableMultiSelect
    id={id}
    fieldLabel="OS"
    menuLabel="Operating systems"
    allLabel="All OS"
    countLabel={(count) => `${count} platforms`}
    ariaLabel="Filter by operating system"
    options={OS_OPTIONS}
    selected={selected}
    onSelectedChange={onSelectedChange}
    resolveLabel={platformAriaLabel}
    renderOption={(platform) => (
      <span className="inline-flex items-center gap-2">
        <PlatformIcon platform={platform} className="size-4" />
        {platformAriaLabel(platform)}
      </span>
    )}
  />
)
