import { PageIntro } from "@/components/dashboard/page-intro"
import { VrTable } from "@/components/tables/vr-table"
import { dashboardPageIntros } from "@/content/dashboard-pages"

export default function VrPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageIntro title="VR" description={dashboardPageIntros.vr} />
      <VrTable />
    </div>
  )
}
