import { OverviewSummary } from "@/components/dashboard/overview-summary"

export default async function OverviewPage({
  params,
}: {
  params: Promise<{ steamid: string }>
}) {
  const { steamid } = await params
  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-2xl font-semibold">Overview</h1>
      <OverviewSummary steamid={steamid} />
    </div>
  )
}
