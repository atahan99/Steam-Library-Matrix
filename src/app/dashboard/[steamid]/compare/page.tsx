import { PageIntro } from "@/components/dashboard/page-intro"
import { CompareView } from "@/components/compare/compare-view"
import { dashboardPageIntros } from "@/content/dashboard-pages"

export default function ComparePage() {
  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        title="Compare"
        description={dashboardPageIntros.compare}
      />
      <CompareView />
    </div>
  )
}
