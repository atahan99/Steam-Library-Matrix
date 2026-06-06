import { PageIntro } from "@/components/dashboard/page-intro"
import { BacklogInsights } from "@/components/dashboard/backlog-insights"
import { BacklogProvider } from "@/components/dashboard/backlog-context"
import { BacklogQueue } from "@/components/dashboard/backlog-queue"
import { RandomPickerPanel } from "@/components/dashboard/random-picker-panel"
import { dashboardPageIntros } from "@/content/dashboard-pages"

export default function BacklogPage() {
  return (
    <div className="flex flex-col gap-6">
      <PageIntro title="Backlog" description={dashboardPageIntros.random} />
      <BacklogProvider>
        <BacklogInsights />
        <BacklogQueue />
      </BacklogProvider>
      <section className="flex flex-col gap-3" aria-label="Random pick">
        <div>
          <h2 className="text-lg font-semibold">Surprise me</h2>
          <p className="text-sm text-muted-foreground">
            Two fresh picks from your backlog each time you roll.
          </p>
        </div>
        <RandomPickerPanel />
      </section>
    </div>
  )
}
