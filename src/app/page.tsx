import { LandingHero } from "@/components/landing/landing-hero"
import { SteamProfileForm } from "@/components/landing/steam-profile-form"
import { AppFooter } from "@/components/layout/app-footer"

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center px-6 py-20 md:py-24">
        <div
          className="landing-hero-glow landing-grid-depth pointer-events-none absolute inset-0"
          aria-hidden
        />
        <div className="relative flex w-full max-w-xl flex-col items-center gap-10">
          <LandingHero />
          <SteamProfileForm />
        </div>
      </main>
      <AppFooter className="mt-auto" />
    </div>
  )
}
