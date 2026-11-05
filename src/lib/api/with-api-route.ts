import { NextResponse } from "next/server"
import { checkRateLimit, type RateLimitTier } from "@/lib/api/rate-limit"
import { toApiErrorResponse } from "@/lib/api/api-error"

export type ApiRouteOptions = {
  tier?: RateLimitTier
}

// CSRF: browsers always send Origin on cross-site writes; CLI clients send none
const isCrossOriginWrite = (request: Request): boolean => {
  if (request.method === "GET" || request.method === "HEAD") return false
  const origin = request.headers.get("origin")
  if (!origin) return false
  const host = request.headers.get("host") ?? new URL(request.url).host
  try {
    return new URL(origin).host !== host
  } catch {
    return true
  }
}

export const runApiRoute = async (
  request: Request,
  options: ApiRouteOptions,
  handler: () => Promise<NextResponse>
): Promise<NextResponse> => {
  const tier = options.tier ?? "default"

  if (isCrossOriginWrite(request)) {
    return NextResponse.json({ error: "Cross-origin request" }, { status: 403 })
  }

  const rateLimited = checkRateLimit(request, tier)
  if (rateLimited) return rateLimited

  try {
    return await handler()
  } catch (error) {
    return toApiErrorResponse(error)
  }
}
