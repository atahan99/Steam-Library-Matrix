import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { getRuntimeEnv } from "@/lib/env/runtime-env"

export const secretsEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

export const verifyBearerSecret = (
  request: Request,
  secret: string | undefined,
  options?: {
    missingSecretResponse?: NextResponse
    missingAuthMessage?: string
    invalidSecretMessage?: string
  }
): NextResponse | null => {
  if (!secret) {
    return (
      options?.missingSecretResponse ??
      NextResponse.json({ error: "Secret is not configured" }, { status: 503 })
    )
  }

  const auth = request.headers.get("authorization")
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json(
      {
        error:
          options?.missingAuthMessage ??
          "Authorization required. Send Authorization: Bearer <secret>.",
      },
      { status: 401 }
    )
  }

  const token = auth.slice("Bearer ".length).trim()
  if (!secretsEqual(token, secret)) {
    return NextResponse.json(
      { error: options?.invalidSecretMessage ?? "Invalid API secret" },
      { status: 401 }
    )
  }

  return null
}

/** True when SLM_API_SECRET is set and SLM_ALLOW_OPEN_API is not true. */
export const isApiGuardRequired = (): boolean => {
  const secret = getRuntimeEnv("SLM_API_SECRET")?.trim()
  const allowOpen = getRuntimeEnv("SLM_ALLOW_OPEN_API") === "true"
  return Boolean(secret) && !allowOpen
}

export const requireApiAuth = (request: Request): NextResponse | null => {
  if (!isApiGuardRequired()) return null

  return verifyBearerSecret(request, getRuntimeEnv("SLM_API_SECRET")?.trim(), {
    missingAuthMessage:
      "Authorization required. Send Authorization: Bearer <SLM_API_SECRET>, or set SLM_ALLOW_OPEN_API=true for private LAN deployments.",
    invalidSecretMessage: "Invalid API secret",
  })
}

export const requireCronAuth = (request: Request): NextResponse | null =>
  verifyBearerSecret(request, getRuntimeEnv("CRON_SECRET")?.trim(), {
    missingSecretResponse: NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 }
    ),
    missingAuthMessage: "Unauthorized",
    invalidSecretMessage: "Unauthorized",
  })
