import { PROTON_CHART_TIER_LABEL } from "@/lib/dashboard/proton-tier-chart-data"
import { cn } from "@/lib/utils"

type NotYetReleasedLabelProps = {
  className?: string
}

export const NotYetReleasedLabel = ({ className }: NotYetReleasedLabelProps) => {
  const full = PROTON_CHART_TIER_LABEL.not_yet_released
  const lastSpace = full.lastIndexOf(" ")
  const line1 = full.slice(0, lastSpace)
  const line2 = full.slice(lastSpace + 1)

  return (
    <span className={cn("inline-flex flex-col leading-tight", className)}>
      <span>{line1}</span>
      <span>{line2}</span>
    </span>
  )
}
