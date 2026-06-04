import { NextResponse } from "next/server"
import { getErrorMessage } from "@/lib/utils/get-error-message"

type ApiErrorOptions = {
  publicMessage?: string
  status?: number
  /** When true, return the underlying message even in production (user-facing errors). */
  exposeMessage?: boolean
}

export const toApiErrorResponse = (
  error: unknown,
  options: ApiErrorOptions = {}
): NextResponse => {
  const status = options.status ?? 500
  const detail = getErrorMessage(error)
  const isProd = process.env.NODE_ENV === "production"

  console.error("[api]", detail, error)

  const message =
    !isProd || options.exposeMessage
      ? detail || options.publicMessage || "Request failed"
      : options.publicMessage ?? "An unexpected error occurred"

  return NextResponse.json({ error: message }, { status })
}
