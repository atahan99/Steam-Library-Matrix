import { CoverColumns } from "@/components/landing/cover-columns"
import { LandingHero } from "@/components/landing/landing-hero"
import { SteamProfileForm } from "@/components/landing/steam-profile-form"
import { AppFooter } from "@/components/layout/app-footer"

export default function HomePage() {
  return (
    // Desktop: exactly one screen (content scales down on short screens); mobile scrolls.
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-background lg:h-dvh">
      <CoverColumns />
      <main className="relative mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-6">
        <div className="landing-hero-glow pointer-events-none absolute inset-0" aria-hidden />
        <div className="landing-stack relative flex w-full max-w-xl flex-col items-center gap-6">
          <LandingHero />
          <SteamProfileForm />
        </div>
      </main>
      <AppFooter className="relative shrink-0 py-3" />
    </div>
  )
}
