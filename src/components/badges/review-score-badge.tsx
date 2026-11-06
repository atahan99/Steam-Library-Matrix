import { steamReviewScore, type ReviewTone } from "@/lib/utils/steam-review-score"
import { cn } from "@/lib/utils"

// Steam's store colors: blue for positive, amber for mixed, red for negative.
const TONE_CLASS: Record<ReviewTone, string> = {
  positive: "text-sky-400",
  mixed: "text-amber-400",
  negative: "text-red-400",
}

/** Steam-style review summary from SteamSpy counts, e.g. "Very Positive · 92%". */
export const ReviewScoreBadge = ({
  positive,
  negative,
  showCount = false,
  className,
}: {
  positive?: number
  negative?: number
  showCount?: boolean
  className?: string
}) => {
  const score = steamReviewScore(positive, negative)
  if (!score) return <span className={cn("text-muted-foreground", className)}>—</span>
  return (
    <span
      className={cn("whitespace-nowrap", className)}
      title={`${score.total.toLocaleString("en-US")} Steam reviews (via SteamSpy)`}
    >
      <span className={TONE_CLASS[score.tone]}>{score.label}</span>
      <span className="text-muted-foreground">
        {" "}
        · {score.percent}%
        {showCount ? ` of ${score.total.toLocaleString("en-US")}` : ""}
      </span>
    </span>
  )
}
