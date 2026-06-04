import { PageIntro } from "@/components/dashboard/page-intro"
import { ProtonDbDashboard } from "@/components/dashboard/protondb-dashboard"
import { BrandIcon } from "@/components/icons/brand-icon"
import { dashboardPageIntros } from "@/content/dashboard-pages"

export default function ProtonDbPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        title={
          <span className="flex items-center gap-2">
            <BrandIcon brand="protondb" className="size-7" />
            ProtonDB
          </span>
        }
        description={dashboardPageIntros.protondb}
      />
      <ProtonDbDashboard />
    </div>
  )
}
