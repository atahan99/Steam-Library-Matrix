import type { ProtonChartTier } from "@/lib/dashboard/proton-tier-chart-data"
import type { ChartConfig } from "@/components/ui/chart"
import type { CSSProperties } from "react"

export const PROTON_TIER_FILL: Record<ProtonChartTier, string> = {
  platinum: "var(--proton-platinum)",
  gold: "var(--proton-gold)",
  silver: "var(--proton-silver)",
  bronze: "var(--proton-bronze)",
  borked: "var(--proton-borked)",
  native: "var(--proton-native)",
  unknown: "var(--proton-unknown)",
  not_yet_released: "var(--muted-foreground)",
  not_enriched: "var(--secondary)",
}

const PROTON_TIER_BADGE_SURFACE: Partial<
  Record<
    ProtonChartTier,
    { color: string; backgroundColor: string; borderColor: string }
  >
> = {
  platinum: {
    color: "var(--proton-platinum)",
    backgroundColor: "var(--proton-platinum-bg)",
    borderColor: "var(--proton-platinum-border)",
  },
  gold: {
    color: "var(--proton-gold)",
    backgroundColor: "var(--proton-gold-bg)",
    borderColor: "var(--proton-gold-border)",
  },
  silver: {
    color: "var(--proton-silver)",
    backgroundColor: "var(--proton-silver-bg)",
    borderColor: "var(--proton-silver-border)",
  },
  bronze: {
    color: "var(--proton-bronze)",
    backgroundColor: "var(--proton-bronze-bg)",
    borderColor: "var(--proton-bronze-border)",
  },
  borked: {
    color: "var(--proton-borked)",
    backgroundColor: "var(--proton-borked-bg)",
    borderColor: "var(--proton-borked-border)",
  },
  native: {
    color: "var(--proton-native)",
    backgroundColor: "var(--proton-native-bg)",
    borderColor: "var(--proton-native-border)",
  },
}

const TIER_BADGE_STATIC_CLASS: Partial<Record<ProtonChartTier, string>> = {
  unknown: "border-border bg-muted/30 text-muted-foreground",
  not_yet_released: "border-border bg-muted/25 text-muted-foreground",
  not_enriched:
    "border-dashed border-border bg-secondary/40 text-muted-foreground",
}

const TIER_BADGE_GLOW_CLASS: Partial<Record<ProtonChartTier, string>> = {
  platinum: "shadow-[0_0_12px_-4px_var(--proton-platinum-border)]",
  gold: "shadow-[0_0_12px_-4px_var(--proton-gold-border)]",
  silver: "shadow-[0_0_12px_-4px_var(--proton-silver-border)]",
  bronze: "shadow-[0_0_12px_-4px_var(--proton-bronze-border)]",
  borked: "shadow-[0_0_12px_-4px_var(--proton-borked-border)]",
  native: "shadow-[0_0_12px_-4px_var(--proton-native-border)]",
}

export const getProtonTierBadgeClassName = (tier: ProtonChartTier): string =>
  TIER_BADGE_STATIC_CLASS[tier] ?? TIER_BADGE_GLOW_CLASS[tier] ?? ""

export const getProtonTierBadgeStyle = (
  tier: ProtonChartTier
): CSSProperties | undefined => {
  if (tier in TIER_BADGE_STATIC_CLASS) return undefined
  return PROTON_TIER_BADGE_SURFACE[tier]
}

export const PROTON_CHART_CONFIG = {
  count: { label: "Games" },
  platinum: { label: "Platinum", color: PROTON_TIER_FILL.platinum },
  gold: { label: "Gold", color: PROTON_TIER_FILL.gold },
  silver: { label: "Silver", color: PROTON_TIER_FILL.silver },
  bronze: { label: "Bronze", color: PROTON_TIER_FILL.bronze },
  borked: { label: "Borked", color: PROTON_TIER_FILL.borked },
} satisfies ChartConfig
