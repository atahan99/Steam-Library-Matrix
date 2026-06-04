import type { Metadata } from "next"
import { AboutStandalonePage } from "@/components/about/about-standalone-page"
import { APP_NAME } from "@/lib/brand"

export const metadata: Metadata = {
  title: `About · ${APP_NAME}`,
  description:
    "What Steam Library Matrix does, which data sources it uses, and how enrichment works.",
}

export default function AboutPage() {
  return <AboutStandalonePage />
}
