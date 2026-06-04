import { PageIntro } from "@/components/dashboard/page-intro"
import { RandomPickerPanel } from "@/components/dashboard/random-picker-panel"
import { dashboardPageIntros } from "@/content/dashboard-pages"

export default function RandomPickerPage() {
  return (
    <div className="flex flex-col gap-4">
      <PageIntro
        title="Random Game Picker"
        description={dashboardPageIntros.random}
      />
      <RandomPickerPanel />
    </div>
  )
}
