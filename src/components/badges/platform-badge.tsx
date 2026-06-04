import { Badge } from "@/components/ui/badge"
import {
  PlatformIcon,
  platformAriaLabel,
  type Platform,
} from "@/components/icons/platform-icon"
import { cn } from "@/lib/utils"

export type { Platform }

export const PlatformBadge = ({
  platform,
  supported,
  title,
}: {
  platform: Platform
  supported?: boolean
  title?: string
}) => {
  const label = title ?? platformAriaLabel(platform, supported)

  return (
  <Badge
    variant="outline"
    className={cn(
      "bg-transparent px-1.5 py-0.5",
      supported
        ? "border-emerald-500/80 text-foreground"
        : "border-border opacity-50"
    )}
    aria-label={label}
    title={label}
  >
    <PlatformIcon platform={platform} />
  </Badge>
  )
}
