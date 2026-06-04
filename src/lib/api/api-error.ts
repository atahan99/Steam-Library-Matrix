import { NextResponse } from "next/server"
import { STEAM_API_KEY_ERROR_MESSAGE } from "@/lib/steam/steam-api"
import { getErrorMessage } from "@/lib/utils/get-error-message"

export const shouldExposeApiErrorMessage = (error: unknown): boolean => {
  const detail = getErrorMessage(error)
  if (detail === STEAM_API_KEY_ERROR_MESSAGE) return true
  if (detail.startsWith("This Steam profile")) return true
  return false
}

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

  const expose =
    options.exposeMessage || (!isProd && Boolean(detail)) || shouldExposeApiErrorMessage(error)

  const message = expose
    ? detail || options.publicMessage || "Request failed"
    : options.publicMessage ?? "An unexpected error occurred"

  return NextResponse.json({ error: message }, { status })
}
