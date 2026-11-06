export type ReviewTone = "positive" | "mixed" | "negative"

export type SteamReviewScore = {
  percent: number
  total: number
  label: string
  tone: ReviewTone
}

/**
 * Steam's own review summary rules (score % plus review-count tiers), so the label
 * matches what the store shows. Under 10 reviews Steam shows no summary, and neither do we.
 */
export const steamReviewScore = (
  positive: number | undefined,
  negative: number | undefined
): SteamReviewScore | null => {
  const total = (positive ?? 0) + (negative ?? 0)
  if (positive == null || total < 10) return null
  const percent = Math.round((positive / total) * 100)

  if (percent >= 80) {
    const label =
      total >= 500 && percent >= 95
        ? "Overwhelmingly Positive"
        : total >= 50
          ? "Very Positive"
          : "Positive"
    return { percent, total, label, tone: "positive" }
  }
  if (percent >= 70) return { percent, total, label: "Mostly Positive", tone: "positive" }
  if (percent >= 40) return { percent, total, label: "Mixed", tone: "mixed" }
  if (percent >= 20) return { percent, total, label: "Mostly Negative", tone: "negative" }
  const label =
    total >= 500 ? "Overwhelmingly Negative" : total >= 50 ? "Very Negative" : "Negative"
  return { percent, total, label, tone: "negative" }
}
