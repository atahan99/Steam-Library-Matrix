import { PageIntro } from "@/components/dashboard/page-intro"
import { LibraryTable } from "@/components/tables/library-table"
import { dashboardPageIntros } from "@/content/dashboard-pages"

export default function LibraryPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        title="Library"
        description={dashboardPageIntros.library}
      />
      <LibraryTable />
    </div>
  )
}
