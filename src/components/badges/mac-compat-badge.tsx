import {
  macRatingDisplay,
  type MacRating,
  type MacRatingTone,
} from "@/lib/mac/macos-compat-rating"
import { cn } from "@/lib/utils"

const TONE_CLASS: Record<MacRatingTone, string> = {
  good: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  ok: "border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400",
  warn: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  bad: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  muted: "border-border bg-muted/40 text-muted-foreground",
}

/**
 * Badge for an AppleGamingWiki compatibility rating. Renders an em dash for
 * untested ("unknown") ratings unless `showUnknown` is set.
 */
export const MacCompatBadge = ({
  rating,
  showUnknown = false,
  className,
}: {
  rating: MacRating
  showUnknown?: boolean
  className?: string
}) => {
  if (rating === "unknown" && !showUnknown) {
    return <span className="text-muted-foreground">—</span>
  }
  const { label, tone } = macRatingDisplay(rating)
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        TONE_CLASS[tone],
        className
      )}
    >
      {label}
    </span>
  )
}
