import { PageIntro } from "@/components/dashboard/page-intro"
import { GenresDashboard } from "@/components/dashboard/genres-dashboard"
import { dashboardPageIntros } from "@/content/dashboard-pages"

export default function GenresPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageIntro title="Genres" description={dashboardPageIntros.genres} />
      <GenresDashboard />
    </div>
  )
}
