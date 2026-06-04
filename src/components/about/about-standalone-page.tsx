"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AboutPageContent } from "@/components/about/about-page-content"
import { AppFooter } from "@/components/layout/app-footer"
import { getActiveSteamid } from "@/lib/session/active-profile"

export const AboutStandalonePage = () => {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const steamid = getActiveSteamid()
    if (steamid) {
      router.replace(`/dashboard/${steamid}/about`)
      return
    }
    setReady(true)
  }, [router])

  if (!ready) {
    return null
  }

  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex-1">
        <AboutPageContent />
      </main>
      <AppFooter className="mt-auto" />
    </div>
  )
}
