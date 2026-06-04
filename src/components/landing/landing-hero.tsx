import { LibraryOrbit } from "@/components/visual/library-orbit"
import { APP_NAME } from "@/lib/brand"

export const LandingHero = () => {
  return (
    <header className="flex w-full flex-col items-center text-center">
      <p className="text-product-title text-5xl font-bold tracking-tight md:text-6xl">
        {APP_NAME}
      </p>
      <h1 className="text-neon-glow mt-5 text-2xl font-semibold text-primary md:text-3xl">
        Your library, decoded
      </h1>
      <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
        Import your public Steam library, enrich it with compatibility and
        completion data, and explore it in one dashboard.
      </p>
      <LibraryOrbit variant="landing" className="mt-8" />
    </header>
  )
}
