import { timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import type { ZodSafeParseError } from "zod"
import { isDbConfiguredAtRuntime } from "@/lib/db/client"
import { getRuntimeEnv } from "@/lib/env/runtime-env"
import { PRIVATE_LIBRARY_MESSAGE } from "@/lib/steam/steam-api"
import { getErrorMessage } from "@/lib/utils/get-error-message"
import { toApiErrorResponse } from "@/lib/api/api-error"

export const secretsEqual = (a: string, b: string): boolean => {
  if (a.length !== b.length) return false
  return timingSafeEqual(Buffer.from(a), Buffer.from(b))
}

const verifyBearerSecret = (
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

export const requireCronAuth = (request: Request): NextResponse | null =>
  verifyBearerSecret(request, getRuntimeEnv("CRON_SECRET")?.trim(), {
    missingSecretResponse: NextResponse.json(
      { error: "CRON_SECRET is not configured" },
      { status: 503 }
    ),
    missingAuthMessage: "Unauthorized",
    invalidSecretMessage: "Unauthorized",
  })

export const requireDbConfigured = async (): Promise<NextResponse | null> => {
  if (!(await isDbConfiguredAtRuntime())) {
    return NextResponse.json(
      { error: "DATABASE_URL is not configured" },
      { status: 503 }
    )
  }
  return null
}

export const zodErrorResponse = (
  error: ZodSafeParseError<unknown>
): NextResponse =>
  NextResponse.json(
    { error: error.error.issues[0]?.message ?? "Invalid request" },
    { status: 400 }
  )

export const privateLibraryErrorResponse = (
  error: unknown,
  fallbackMessage: string
): NextResponse | null => {
  const message = getErrorMessage(error) || fallbackMessage
  if (message !== PRIVATE_LIBRARY_MESSAGE) return null
  return toApiErrorResponse(error, {
    status: 403,
    exposeMessage: true,
    publicMessage: message,
  })
}
