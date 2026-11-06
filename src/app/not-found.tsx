import Link from "next/link"
import { GameOverScene } from "@/components/visual/game-over-scene"
import { APP_NAME } from "@/lib/brand"

export default function NotFound() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="relative mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-6 p-8 text-center"
    >
      <div className="landing-hero-glow pointer-events-none absolute inset-0" aria-hidden />
      <GameOverScene className="relative w-full max-w-sm" />
      <div className="relative flex flex-col items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
        <p className="text-muted-foreground">
          Game over for this link. The page doesn&apos;t exist in {APP_NAME}.
        </p>
      </div>
      <Link
        href="/"
        className="relative inline-flex h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Back to home
      </Link>
    </main>
  )
}
