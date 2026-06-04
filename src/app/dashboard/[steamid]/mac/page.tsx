import { PageIntro } from "@/components/dashboard/page-intro"
import { BrandIcon } from "@/components/icons/brand-icon"
import { MacTable } from "@/components/tables/mac-table"
import { dashboardPageIntros } from "@/content/dashboard-pages"

export default function MacSupportPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        title={
          <span className="flex items-center gap-2">
            <BrandIcon brand="apple" className="size-7" />
            Mac Support
          </span>
        }
        description={dashboardPageIntros.mac}
      />
      <MacTable />
    </div>
  )
}
