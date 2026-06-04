import Link from "next/link"
import { APP_NAME } from "@/lib/brand"

export default function NotFound() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto flex min-h-svh max-w-lg flex-col justify-center gap-6 p-8"
    >
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="text-muted-foreground">
        The page you requested does not exist in {APP_NAME}.
      </p>
      <Link
        href="/"
        className="inline-flex h-10 w-fit items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Back to home
      </Link>
    </main>
  )
}
