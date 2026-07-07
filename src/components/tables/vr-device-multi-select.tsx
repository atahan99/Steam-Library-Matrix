"use client"

import { TableMultiSelect } from "@/components/tables/table-multi-select"

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
}: VrDeviceMultiSelectProps) => (
  <TableMultiSelect
    id={id}
    fieldLabel="VR devices"
    menuLabel="VR devices"
    allLabel="All VR devices"
    countLabel={(count) => `${count} devices`}
    ariaLabel="Filter by VR device or feature"
    options={options}
    selected={selected}
    onSelectedChange={onSelectedChange}
    emptyMessage="No VR device tags yet. Run Steam app details from Data Status."
  />
)
