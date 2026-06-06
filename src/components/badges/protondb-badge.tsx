import { Badge } from "@/components/ui/badge"
import { NotYetReleasedLabel } from "@/components/badges/not-yet-released-label"
import {
  getProtonChartTier,
  PROTON_CHART_TIER_LABEL,
  type ProtonChartTier,
} from "@/lib/dashboard/proton-tier-chart-data"
import {
  getProtonTierBadgeClassName,
  getProtonTierBadgeStyle,
} from "@/lib/dashboard/proton-tier-colors"
import type { DashboardGame, ProtonDbTier } from "@/types/dashboard"
import { cn } from "@/lib/utils"

const tierLabel: Record<ProtonDbTier, string> = {
  platinum: "Platinum",
  gold: "Gold",
  silver: "Silver",
  bronze: "Bronze",
  borked: "Borked",
  native: "Native",
  unknown: "Unknown",
}

type ProtonDbBadgeProps = {
  tier?: ProtonDbTier
  chartTier?: ProtonChartTier
  game?: DashboardGame
}

const resolveChartTier = (
  tier: ProtonDbTier | undefined,
  chartTier: ProtonChartTier | undefined,
  game: DashboardGame | undefined
): ProtonChartTier => {
  if (chartTier) return chartTier
  if (game) return getProtonChartTier(game)
  if (!tier) return "not_enriched"
  if (tier === "native" || tier === "unknown") return tier
  return tier
}

export const ProtonDbBadge = ({
  tier,
  chartTier,
  game,
}: ProtonDbBadgeProps) => {
  const resolved = resolveChartTier(tier, chartTier, game)
  const label =
    resolved === "not_enriched" || resolved === "not_yet_released"
      ? PROTON_CHART_TIER_LABEL[resolved]
      : tier
        ? tierLabel[tier]
        : PROTON_CHART_TIER_LABEL[resolved]

  const badgeStyle = getProtonTierBadgeStyle(resolved)
  const isNotYetReleased = resolved === "not_yet_released"

  const renderLabel = () => {
    if (!isNotYetReleased) return label
    return <NotYetReleasedLabel className="items-center capitalize" />
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "capitalize",
        isNotYetReleased && "h-auto min-h-5 whitespace-normal py-0.5",
        getProtonTierBadgeClassName(resolved)
      )}
      style={badgeStyle}
    >
      {renderLabel()}
    </Badge>
  )
}
