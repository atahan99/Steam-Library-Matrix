import type { Metadata } from "next"
import { notFound } from "next/navigation"
import Link from "next/link"
import { DashboardShell } from "@/components/dashboard/dashboard-shell"
import { fetchDashboardPayload } from "@/lib/db/dashboard"
import { isDbConfiguredAtRuntime } from "@/lib/db/client"
import { shouldUseServerRefreshActions } from "@/lib/api/server-refresh-mode"
import { getErrorMessage } from "@/lib/utils/get-error-message"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default async function DashboardLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ steamid: string }>
}) {
  const { steamid } = await params

  if (!(await isDbConfiguredAtRuntime())) {
    return (
      <main className="mx-auto max-w-lg p-8">
        <Alert variant="destructive">
          <AlertTitle>Database not configured</AlertTitle>
          <AlertDescription>
            Set DATABASE_URL=file:./data/matrix.db in .env, then run pnpm db:migrate.
          </AlertDescription>
        </Alert>
      </main>
    )
  }

  let data
  try {
    data = await fetchDashboardPayload(steamid)
  } catch (error) {
    const message = getErrorMessage(error)
    return (
      <main className="mx-auto flex max-w-lg flex-col gap-4 p-8">
        <Alert variant="destructive">
          <AlertTitle>Could not load dashboard</AlertTitle>
          <AlertDescription>{message}</AlertDescription>
        </Alert>
        <p className="text-sm text-muted-foreground">
          If you recently updated the app, run pnpm db:migrate, then try again.
        </p>
        <Link
          href="/"
          className="inline-flex h-8 items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium hover:bg-muted"
        >
          Back to import
        </Link>
      </main>
    )
  }

  if (!data) {
    notFound()
  }

  const useServerRefreshActions = shouldUseServerRefreshActions()

  return (
    <DashboardShell
      steamid={steamid}
      data={data}
      useServerRefreshActions={useServerRefreshActions}
    >
      {children}
    </DashboardShell>
  )
}
