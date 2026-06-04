import { AntiCheatSummary } from "@/components/dashboard/anticheat-summary"
import { PageIntro } from "@/components/dashboard/page-intro"
import { AntiCheatTable } from "@/components/tables/anticheat-table"
import { dashboardPageIntros } from "@/content/dashboard-pages"

export default function AntiCheatPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageIntro
        title="Anti-Cheat"
        description={dashboardPageIntros.anticheat}
      />
      <AntiCheatSummary />
      <AntiCheatTable />
    </div>
  )
}
