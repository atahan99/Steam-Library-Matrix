import type { ReactElement } from "react"
import { cn } from "@/lib/utils"

export type SourceSiteSlug = "awacy" | "levvvel" | "hltb"

/** Are We Anti-Cheat Yet — shield mark (currentColor). */
const AwacySiteIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden
  >
    <path
      fill="currentColor"
      d="M12 2 4 5.5v5.8c0 5.1 3.4 9.8 8 10.7 4.6-.9 8-5.6 8-10.7V5.5L12 2zm0 2.2 6 2.5v4.6c0 4-2.7 7.7-6 8.5-3.3-.8-6-4.5-6-8.5V6.7l6-2.5z"
    />
    <path
      fill="currentColor"
      d="M9.5 11.2a2.5 2.5 0 1 1 4.2 1.8l-1.1 1.5h2.4v1.6h-4.3l1.8-2.5a1 1 0 0 0-1.5-.9 1 1 0 0 0-.5 1.5z"
      opacity="0.9"
    />
  </svg>
)

/** Levvvel — triple-V mark inspired by their site favicon (currentColor). */
const LevvvelSiteIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden
  >
    <path fill="currentColor" d="M3 17 6.5 7 10 17Z" opacity="0.5" />
    <path fill="currentColor" d="M8.5 17 12 7 15.5 17Z" />
    <path fill="currentColor" d="M14 17 17.5 7 21 17Z" opacity="0.5" />
  </svg>
)

/** HowLongToBeat — hourglass mark (currentColor). */
const HltbSiteIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden
  >
    <path
      fill="currentColor"
      d="M7 3h10v2.2l-3.4 4.2L17 13.8V18H7v-4.2l3.4-4.4L7 5.2V3zm2 2v.8l3.2 4 3.2-4V5H9zm0 14h6v-.8l-3.2-4-3.2 4V17z"
    />
  </svg>
)

const SOURCE_SITE_ICON: Record<
  SourceSiteSlug,
  ({ className }: { className?: string }) => ReactElement
> = {
  awacy: AwacySiteIcon,
  levvvel: LevvvelSiteIcon,
  hltb: HltbSiteIcon,
}

export const SourceSiteIcon = ({
  site,
  className,
}: {
  site: SourceSiteSlug
  className?: string
}) => {
  const Icon = SOURCE_SITE_ICON[site]
  return <Icon className={cn("size-4 shrink-0", className)} />
}
