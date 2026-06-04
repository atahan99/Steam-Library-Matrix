"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { getActiveSteamid } from "@/lib/session/active-profile"

export default function DashboardIndexPage() {
  const router = useRouter()

  useEffect(() => {
    const steamid = getActiveSteamid()
    if (steamid) {
      router.replace(`/dashboard/${steamid}`)
      return
    }
    router.replace("/")
  }, [router])

  return (
    <main className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
      Opening your dashboard…
    </main>
  )
}
