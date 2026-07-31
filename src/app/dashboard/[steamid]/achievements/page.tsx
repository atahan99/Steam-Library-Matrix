import { PageIntro } from "@/components/dashboard/page-intro"
import { AchievementsDashboard } from "@/components/dashboard/achievements-dashboard"
import { dashboardPageIntros } from "@/content/dashboard-pages"

export default function AchievementsPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        title="Achievements"
        description={dashboardPageIntros.achievements}
      />
      <AchievementsDashboard />
    </div>
  )
}
