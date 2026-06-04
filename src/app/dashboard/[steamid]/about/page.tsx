import type { Metadata } from "next"
import { AboutPageContent } from "@/components/about/about-page-content"
import { APP_NAME } from "@/lib/brand"

export const metadata: Metadata = {
  title: `About · ${APP_NAME}`,
  description:
    "What Steam Library Matrix does, which data sources it uses, and how enrichment works.",
}

export default function DashboardAboutPage() {
  return <AboutPageContent embedded />
}
