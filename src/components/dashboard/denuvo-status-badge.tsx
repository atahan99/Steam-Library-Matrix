"use client"

import { Badge } from "@/components/ui/badge"
import type { DashboardGame } from "@/types/dashboard"
import { cn } from "@/lib/utils"

const DENUVO_BADGE_CLASS =
  "h-auto min-h-5 max-w-[4.75rem] shrink overflow-visible px-1.5 py-0.5 text-center leading-tight !whitespace-normal"

type DenuvoKind = "detected" | "possible" | "unknown" | "confirmed_absent"

const DenuvoBadgeLabel = ({ kind }: { kind: DenuvoKind }) => {
  switch (kind) {
    case "detected":
      return (
        <>
          Denuvo
          <br />
          detected
        </>
      )
    case "possible":
      return (
        <>
          Possible
          <br />
          Denuvo
        </>
      )
    case "confirmed_absent":
      return (
        <>
          No active
          <br />
          Denuvo confirmed
        </>
      )
    default:
      return (
        <>
          DRM status
          <br />
          unknown
        </>
      )
  }
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
        title="Steam does not reliably expose third-party DRM through appdetails."
        className={DENUVO_BADGE_CLASS}
      >
        <DenuvoBadgeLabel kind="unknown" />
      </Badge>
    )
  }

  return (
    <Badge
      variant={display.variant}
      title={display.tooltip}
      className={cn(DENUVO_BADGE_CLASS)}
    >
      <DenuvoBadgeLabel kind={display.kind} />
    </Badge>
  )
}
