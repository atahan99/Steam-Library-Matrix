import { PageIntro } from "@/components/dashboard/page-intro"
import { HltbTable } from "@/components/tables/hltb-table"
import { dashboardPageIntros } from "@/content/dashboard-pages"

export default function HowLongToBeatPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        title="HowLongToBeat"
        description={dashboardPageIntros.howlongtobeat}
      />
      <HltbTable />
    </div>
  )
}
