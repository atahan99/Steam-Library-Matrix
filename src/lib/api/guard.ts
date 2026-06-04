import { NextResponse } from "next/server"
import { getRuntimeEnv } from "@/lib/env/runtime-env"

/** True when SLM_API_SECRET is set and SLM_ALLOW_OPEN_API is not true. */
export const isApiGuardRequired = (): boolean => {
  const secret = getRuntimeEnv("SLM_API_SECRET")?.trim()
  const allowOpen = getRuntimeEnv("SLM_ALLOW_OPEN_API") === "true"
  return Boolean(secret) && !allowOpen
}

export const requireApiAuth = (request: Request): NextResponse | null => {
  if (!isApiGuardRequired()) return null

  const secret = getRuntimeEnv("SLM_API_SECRET")?.trim()
  const auth = request.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        error:
          "Authorization required. Send Authorization: Bearer <SLM_API_SECRET>, or set SLM_ALLOW_OPEN_API=true for private LAN deployments.",
      },
      { status: 401 }
    )
  }

  const token = auth.slice("Bearer ".length).trim()
  if (!secret || token !== secret) {
    return NextResponse.json({ error: "Invalid API secret" }, { status: 401 })
  }

  return null
}
