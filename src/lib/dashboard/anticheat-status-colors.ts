import type { AwacyStatus } from "@/types/dashboard"
import type { CSSProperties } from "react"

export type AwacyBadgeKey = AwacyStatus | "Unknown" | "Not checked"

const AWACY_STATUS_SURFACE: Record<
  AwacyStatus,
  { color: string; backgroundColor: string; borderColor: string }
> = {
  Supported: {
    color: "var(--awacy-supported)",
    backgroundColor: "var(--awacy-supported-bg)",
    borderColor: "var(--awacy-supported-border)",
  },
  Running: {
    color: "var(--awacy-running)",
    backgroundColor: "var(--awacy-running-bg)",
    borderColor: "var(--awacy-running-border)",
  },
  Planned: {
    color: "var(--awacy-planned)",
    backgroundColor: "var(--awacy-planned-bg)",
    borderColor: "var(--awacy-planned-border)",
  },
  Broken: {
    color: "var(--awacy-broken)",
    backgroundColor: "var(--awacy-broken-bg)",
    borderColor: "var(--awacy-broken-border)",
  },
  Denied: {
    color: "var(--awacy-denied)",
    backgroundColor: "var(--awacy-denied-bg)",
    borderColor: "var(--awacy-denied-border)",
  },
}

const AWACY_BADGE_STATIC_CLASS: Record<"Unknown" | "Not checked", string> = {
  Unknown: "border-border bg-muted/30 text-muted-foreground",
  "Not checked":
    "border-dashed border-border bg-secondary/40 text-muted-foreground",
}

const AWACY_BADGE_GLOW_CLASS: Record<AwacyStatus, string> = {
  Supported: "shadow-[0_0_12px_-4px_var(--awacy-supported-border)]",
  Running: "shadow-[0_0_12px_-4px_var(--awacy-running-border)]",
  Planned: "shadow-[0_0_12px_-4px_var(--awacy-planned-border)]",
  Broken: "shadow-[0_0_12px_-4px_var(--awacy-broken-border)]",
  Denied: "shadow-[0_0_12px_-4px_var(--awacy-denied-border)]",
}

export const resolveAwacyBadgeKey = (
  status: string | undefined,
  enriched: boolean
): AwacyBadgeKey => {
  if (!enriched) return "Not checked"
  if (!status || status === "Unknown") return "Unknown"
  if (status in AWACY_STATUS_SURFACE) return status as AwacyStatus
  return "Unknown"
}

const isAwacyStaticKey = (
  key: AwacyBadgeKey
): key is keyof typeof AWACY_BADGE_STATIC_CLASS =>
  key === "Unknown" || key === "Not checked"

export const getAwacyStatusBadgeClassName = (key: AwacyBadgeKey): string => {
  if (isAwacyStaticKey(key)) {
    return AWACY_BADGE_STATIC_CLASS[key]
  }
  return AWACY_BADGE_GLOW_CLASS[key]
}

export const getAwacyStatusBadgeStyle = (
  key: AwacyBadgeKey
): CSSProperties | undefined => {
  if (isAwacyStaticKey(key)) return undefined
  return AWACY_STATUS_SURFACE[key]
}
