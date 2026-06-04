import { Badge } from "@/components/ui/badge"
import {
  getAwacyStatusBadgeClassName,
  getAwacyStatusBadgeStyle,
  resolveAwacyBadgeKey,
} from "@/lib/dashboard/anticheat-status-colors"
import { cn } from "@/lib/utils"

type AntiCheatStatusBadgeProps = {
  status?: string
  enriched?: boolean
}

export const AntiCheatStatusBadge = ({
  status,
  enriched = true,
}: AntiCheatStatusBadgeProps) => {
  const key = resolveAwacyBadgeKey(status, enriched)
  const label =
    key === "Not checked" ? "Not checked" : key === "Unknown" ? "Unknown" : status

  return (
    <Badge
      variant="outline"
      className={cn(getAwacyStatusBadgeClassName(key))}
      style={getAwacyStatusBadgeStyle(key)}
    >
      {label}
    </Badge>
  )
}
