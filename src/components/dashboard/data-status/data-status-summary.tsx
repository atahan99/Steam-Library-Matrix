import { formatDateTimeDisplay } from "@/lib/utils/format-datetime"

type DataStatusSummaryProps = {
  libraryTotal: number
  wishlistTotal: number
  enrichTotal: number
  enrichmentPercent: number
  lastProfileSync?: string
}

export const DataStatusSummary = ({
  libraryTotal,
  wishlistTotal,
  enrichTotal,
  enrichmentPercent,
  lastProfileSync,
}: DataStatusSummaryProps) => {
  const metrics = [
    { label: "Library", value: String(libraryTotal) },
    { label: "Wishlist", value: String(wishlistTotal) },
    {
      label: "Enrichment pool",
      value: `${enrichTotal} titles`,
    },
    {
      label: "App details coverage",
      value: `${enrichmentPercent}%`,
    },
    {
      label: "Last profile sync",
      value: lastProfileSync
        ? formatDateTimeDisplay(lastProfileSync)
        : "—",
    },
  ]

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {metrics.map((metric) => (
        <div
          key={metric.label}
          className="rounded-lg border border-border bg-card px-4 py-3"
        >
          <p className="text-xs text-muted-foreground">{metric.label}</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">{metric.value}</p>
        </div>
      ))}
    </div>
  )
}
