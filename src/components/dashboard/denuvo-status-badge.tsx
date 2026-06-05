"use client"

import { Badge } from "@/components/ui/badge"
import type { DashboardGame } from "@/types/dashboard"
import { shouldShowDenuvoCuratorLink } from "@/lib/steam/denuvo/resolve-denuvo-display-state"

type DenuvoStatusBadgeProps = {
  antiCheat?: DashboardGame["antiCheat"]
}

export const DenuvoStatusBadge = ({ antiCheat }: DenuvoStatusBadgeProps) => {
  const display = antiCheat?.denuvoDisplay

  if (!display) {
    return (
      <Badge variant="outline" title="Steam does not reliably expose third-party DRM through appdetails.">
        DRM status unknown
      </Badge>
    )
  }

  return (
    <div className="flex flex-col gap-0.5">
      <Badge variant={display.variant} title={display.tooltip}>
        {display.label}
      </Badge>
      {display.confidence ? (
        <span className="text-xs text-muted-foreground">
          {display.confidence} confidence
          {display.source ? ` · ${display.source}` : ""}
        </span>
      ) : null}
      {shouldShowDenuvoCuratorLink({
        denuvoAntiTamper: antiCheat?.denuvoAntiTamper,
        denuvoConfidence: antiCheat?.denuvoConfidence,
        denuvoSource: antiCheat?.denuvoSource,
      }) ? (
        <span className="text-xs text-muted-foreground">Curator listed</span>
      ) : null}
    </div>
  )
}
