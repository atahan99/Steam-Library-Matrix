import { steamReviewScore, type ReviewTone } from "@/lib/utils/steam-review-score"
import { cn } from "@/lib/utils"

// Steam's store colors: blue for positive, amber for mixed, red for negative.
const TONE_CLASS: Record<ReviewTone, string> = {
  positive: "text-sky-400",
  mixed: "text-amber-400",
  negative: "text-red-400",
}

/**
 * Steam-style review summary from SteamSpy counts. Inline ("Very Positive · 92%") for
 * table cells; `stacked` puts the percent and count on a second line so narrow panels wrap.
 */
export const ReviewScoreBadge = ({
  positive,
  negative,
  stacked = false,
  className,
}: {
  positive?: number
  negative?: number
  stacked?: boolean
  className?: string
}) => {
  const score = steamReviewScore(positive, negative)
  if (!score) return <span className={cn("text-muted-foreground", className)}>—</span>
  const count = score.total.toLocaleString("en-US")
  const title = `${count} Steam reviews (counts via SteamSpy)`

  if (stacked) {
    return (
      <span className={cn("flex min-w-0 flex-col", className)} title={title}>
        <span className={TONE_CLASS[score.tone]}>{score.label}</span>
        <span className="text-xs text-muted-foreground">
          {score.percent}% positive · {count} reviews
        </span>
      </span>
    )
  }

  return (
    <span className={cn("whitespace-nowrap", className)} title={title}>
      <span className={TONE_CLASS[score.tone]}>{score.label}</span>
      <span className="text-muted-foreground"> · {score.percent}%</span>
    </span>
  )
}
