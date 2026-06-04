import { NextResponse } from "next/server"
import { isDbConfiguredAtRuntime, getRawSqlite, prepareDbEnv } from "@/lib/db/client"
import { checkRateLimit } from "@/lib/api/rate-limit"

export const GET = async (request: Request) => {
  const rateLimited = checkRateLimit(request, "default")
  if (rateLimited) return rateLimited

  await prepareDbEnv()

  if (!(await isDbConfiguredAtRuntime())) {
    return NextResponse.json({ ok: true, db: "unconfigured" as const })
  }

  try {
    getRawSqlite().prepare("select 1").get()
    return NextResponse.json({ ok: true, db: "ok" as const })
  } catch (error) {
    console.error("[api/health] database ping failed", error)
    return NextResponse.json({ ok: true, db: "error" as const })
  }
}
