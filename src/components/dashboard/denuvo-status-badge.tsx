"use client"

import { Badge } from "@/components/ui/badge"
import type { DashboardGame } from "@/types/dashboard"

type DenuvoKind = "detected" | "possible" | "unknown" | "confirmed_absent"

// The column header already says "Denuvo / DRM"; the full wording stays in the tooltip.
const SHORT_LABEL: Record<DenuvoKind, string> = {
  detected: "Detected",
  possible: "Possible",
  confirmed_absent: "None",
  unknown: "Unknown",
}

type DenuvoStatusBadgeProps = {
  antiCheat?: DashboardGame["antiCheat"]
}

export const DenuvoStatusBadge = ({ antiCheat }: DenuvoStatusBadgeProps) => {
  const display = antiCheat?.denuvoDisplay

  if (!display) {
    return (
      <Badge
        variant="outline"
        title="DRM status unknown: Steam does not reliably expose third-party DRM through appdetails."
      >
        {SHORT_LABEL.unknown}
      </Badge>
    )
  }

  return (
    <Badge
      variant={display.variant}
      title={display.tooltip ? `${display.label}: ${display.tooltip}` : display.label}
    >
      {SHORT_LABEL[display.kind]}
    </Badge>
  )
}
